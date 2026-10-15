const assert = require('node:assert/strict');
const Bookshelf = require('bookshelf');
const errors = require('@tryghost/errors');
const plugin = require('../..');
const testUtils = require('../utils');

function setupModels(knex, pluginOptions) {
    const bookshelf = Bookshelf(knex);
    const originalModel = bookshelf.Model;
    const savedTagOptions = [];
    bookshelf.plugin(plugin, pluginOptions);

    const Tag = bookshelf.Model.extend({
        tableName: 'tags',
        requireFetch: false,
        initialize() {
            this.on('saving', (model, attributes, options) => {
                if (!model.get('slug')) {
                    throw new errors.ValidationError({ message: 'Slug should not be empty' });
                }
                savedTagOptions.push(options);
            });
        },
    });
    const Author = bookshelf.Model.extend({ tableName: 'authors' });
    const Post = bookshelf.Model.extend({
        tableName: 'posts',
        relationships: ['author', 'tags'],
        relationshipConfig: {
            author: { editable: true },
            tags: { editable: true },
        },
        author() {
            return this.belongsTo(Author, 'author_id');
        },
        tags() {
            return this.belongsToMany(Tag, 'posts_tags', 'post_id', 'tag_id');
        },
    });

    return { bookshelf, Post, originalModel, savedTagOptions };
}

async function snapshot(knex) {
    const result = {};
    for (const table of ['authors', 'posts', 'tags', 'posts_tags']) {
        result[table] = await knex(table).orderBy('id');
    }
    return result;
}

describe('[Integration] Public package boundary', function () {
    let knex;

    beforeEach(async function () {
        await testUtils.database.reset();
        await testUtils.database.init();
        knex = testUtils.database.getConnection();
    });

    it('manually updates relations through the package entrypoint without saving parent attributes', async function () {
        const { bookshelf, Post, originalModel, savedTagOptions } = setupModels(knex, {
            autoHook: false,
        });
        assert.equal(bookshelf.Model, originalModel);
        const parent = await knex('posts').where('title', 'First Post').first();
        const existingTag = await knex('tags').orderBy('id').first();
        const context = { source: 'manual-relations' };

        await bookshelf.transaction(async (transacting) => {
            const model = await Post.where({ id: parent.id }).fetch({ transacting });
            const tags = [{ id: existingTag.id }, { slug: 'manual-new-tag' }];
            model.set({ title: 'unsaved parent change', tags });

            await bookshelf.manager.updateRelations(
                { model, relations: { tags }, pluginOptions: { allowedOptions: ['context'] } },
                { transacting, context },
            );

            assert.deepEqual(model.get('tags'), tags);
            model.unset('tags');
            assert.equal(model.has('tags'), false);
        });

        assert.equal((await knex('posts').where('id', parent.id).first()).title, parent.title);
        const insertedTag = await knex('tags').where('slug', 'manual-new-tag').first();
        assert.ok(insertedTag);
        const joins = await knex('posts_tags').where('post_id', parent.id).orderBy('tag_id');
        assert.deepEqual(
            joins.map((join) => join.tag_id),
            [existingTag.id, insertedTag.id],
        );
        assert.equal(savedTagOptions.length, 1);
        assert.deepEqual(savedTagOptions[0].context, context);
    });

    it('forwards allowed query options and preserves previous relations with the consumer configuration', async function () {
        const { bookshelf, Post, savedTagOptions } = setupModels(knex, {
            editRelations: false,
            allowedOptions: ['context', 'importing', 'migrating'],
            attachPreviousRelations: true,
            extendChanged: '_changed',
        });
        const parent = await knex('posts').where('title', 'Second Post').first();
        const previousTags = await knex('tags').select('id', 'slug').orderBy('id');
        const context = { user: 'test-user' };

        const saved = await bookshelf.transaction(async (transacting) => {
            const model = await Post.where({ id: parent.id }).fetch({
                transacting,
                withRelated: ['tags'],
            });
            return model.save(
                {
                    tags: [
                        { id: previousTags[0].id, slug: 'edited-tag' },
                        { slug: 'consumer-new-tag' },
                    ],
                },
                {
                    transacting,
                    withRelated: ['tags'],
                    context,
                    importing: true,
                    migrating: true,
                    ignoredOption: 'not allowed',
                },
            );
        });

        assert.equal(savedTagOptions.length, 2);
        for (const options of savedTagOptions) {
            assert.deepEqual(options.context, context);
            assert.equal(options.importing, true);
            assert.equal(options.migrating, true);
            assert.equal(options.ignoredOption, undefined);
            assert.ok(options.transacting);
        }
        // oxlint-disable-next-line no-underscore-dangle -- Public plugin option exposes this property.
        const snapshotTags = saved._previousRelations.tags.toJSON();
        assert.deepEqual(
            snapshotTags.map(({ id, slug }) => ({ id, slug })).toSorted((a, b) => a.id - b.id),
            previousTags,
        );
        assert.equal(saved.related('tags').at(0).get('slug'), 'edited-tag');
        assert.equal(
            (await knex('tags').where('id', previousTags[0].id).first()).slug,
            'edited-tag',
        );
        assert.deepEqual(
            // oxlint-disable-next-line no-underscore-dangle -- Matches the consumer's extendChanged option.
            saved._changed.tags.detached.map((tag) => tag.id),
            [previousTags[1].id],
        );
    });

    it('rolls back parent and nested inserts when a later relation fails validation', async function () {
        const { bookshelf, Post } = setupModels(knex);
        const before = await snapshot(knex);

        await assert.rejects(
            bookshelf.transaction((transacting) => {
                return Post.forge({
                    title: 'rollback-parent',
                    author: { name: 'rollback-author' },
                    tags: [{ slug: 'rollback-tag' }, { slug: '' }],
                }).save(null, { transacting });
            }),
            { errorType: 'ValidationError', message: 'Slug should not be empty' },
        );

        assert.deepEqual(await snapshot(knex), before);
    });

    it('rolls back manual relation writes and separately saved parent changes together', async function () {
        const { bookshelf, Post } = setupModels(knex, { autoHook: false });
        const parent = await knex('posts').where('title', 'First Post').first();
        const before = await snapshot(knex);
        const rollback = new Error('caller rejects the transaction');

        await assert.rejects(
            bookshelf.transaction(async (transacting) => {
                const model = await Post.where({ id: parent.id }).fetch({ transacting });
                await model.save({ title: 'rolled-back title' }, { transacting });
                await bookshelf.manager.updateRelations(
                    { model, relations: { tags: [{ slug: 'rolled-back manual tag' }] } },
                    { transacting },
                );
                assert.ok(
                    await transacting('tags').where('slug', 'rolled-back manual tag').first(),
                );
                assert.equal(
                    (await transacting('posts_tags').where('post_id', parent.id)).length,
                    1,
                );
                throw rollback;
            }),
            (error) => error === rollback,
        );

        assert.deepEqual(await snapshot(knex), before);
    });
});
