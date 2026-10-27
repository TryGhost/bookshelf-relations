const assert = require('node:assert/strict');
const Bookshelf = require('bookshelf');
const errors = require('@tryghost/errors');
const plugin = require('../..');
const testUtils = require('../utils');

/**
 * Builds an isolated Bookshelf instance registered with the package entrypoint, the way a
 * consumer such as Ghost does. Related models record the query options they are saved with.
 */
function setupModels(knex, pluginOptions, postProperties = {}) {
    const bookshelf = Bookshelf(knex);
    const originalModel = bookshelf.Model;
    const savedOptions = { tags: [], news: [] };

    bookshelf.plugin(plugin, pluginOptions);

    const Tag = bookshelf.Model.extend({
        tableName: 'tags',
        requireFetch: false,
        initialize() {
            this.on('saving', (model, attributes, options) => {
                if (!model.get('slug')) {
                    throw new errors.ValidationError({ message: 'Slug should not be empty' });
                }
                savedOptions.tags.push(options);
            });
        },
    });
    const News = bookshelf.Model.extend({
        tableName: 'news',
        requireFetch: false,
        initialize() {
            this.on('saving', (model, attributes, options) => {
                savedOptions.news.push(options);
            });
        },
    });
    const Author = bookshelf.Model.extend({ tableName: 'authors', requireFetch: false });
    const CustomField = bookshelf.Model.extend({ tableName: 'custom_fields', requireFetch: false });
    const CustomFields = bookshelf.Collection.extend({ model: CustomField });

    const Post = bookshelf.Model.extend(
        Object.assign(
            {
                tableName: 'posts',
                requireFetch: false,
                relationships: ['author', 'tags', 'news', 'custom_fields'],
                author() {
                    return this.belongsTo(Author, 'author_id');
                },
                tags() {
                    return this.belongsToMany(Tag, 'posts_tags', 'post_id', 'tag_id');
                },
                news() {
                    return this.hasOne(News, 'post_id');
                },
                custom_fields() {
                    return this.hasMany(CustomFields, 'post_id');
                },
            },
            postProperties,
        ),
    );

    return { bookshelf, originalModel, Post, savedOptions };
}

async function snapshot(knex) {
    const result = {};
    for (const table of ['authors', 'posts', 'tags', 'posts_tags', 'news', 'custom_fields']) {
        result[table] = await knex(table).orderBy('id');
    }
    return result;
}

async function postBy(knex, title) {
    return knex('posts').where('title', title).first();
}

async function tagSlugsFor(knex, postId) {
    const rows = await knex('posts_tags')
        .join('tags', 'tags.id', 'posts_tags.tag_id')
        .where('posts_tags.post_id', postId)
        .orderBy('tags.slug')
        .select('tags.slug');
    return rows.map((row) => row.slug);
}

describe('[Integration] Public package registration', function () {
    let knex;

    beforeEach(function () {
        // No queries run here, so these tests skip the database reset the boundary tests need.
        knex = testUtils.database.connect();
    });

    afterEach(async function () {
        await knex.destroy();
    });

    it('registers through the package entrypoint and exposes the relations manager', function () {
        const { bookshelf, originalModel } = setupModels(knex);

        assert.equal(typeof plugin, 'function');
        assert.notEqual(bookshelf.Model, originalModel);
        assert.equal(typeof bookshelf.manager.updateRelations, 'function');
    });

    it('autoHook: false leaves bookshelf.Model untouched and still exposes the relations manager', function () {
        const { bookshelf, originalModel } = setupModels(knex, { autoHook: false });

        assert.equal(bookshelf.Model, originalModel);
        assert.equal(typeof bookshelf.manager.updateRelations, 'function');
    });
});

describe('[Integration] Public package boundary', function () {
    let knex;

    beforeEach(async function () {
        await testUtils.database.reset();
        await testUtils.database.init();
        knex = testUtils.database.getConnection();
    });

    describe('automatic mode (default options)', function () {
        it('inserts a parent with belongsTo, belongsToMany, hasOne and hasMany relations', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const existingTag = await knex('tags').where('slug', 'slug1').first();

            const saved = await bookshelf.transaction((transacting) => {
                return Post.forge({
                    title: 'boundary-insert',
                    author: { name: 'boundary-author' },
                    tags: [{ id: existingTag.id }, { slug: 'boundary-new-tag' }],
                    news: { keywords: 'boundary,news' },
                    custom_fields: [{ key: 'boundary-key', value: 'boundary-value' }],
                }).save(null, { transacting });
            });

            const post = await postBy(knex, 'boundary-insert');
            assert.equal(post.id, saved.id);
            assert.equal(saved.has('tags'), false, 'relation attributes are unset on the parent');

            const author = await knex('authors').where('id', post.author_id).first();
            assert.equal(author.name, 'boundary-author');
            assert.deepEqual(await tagSlugsFor(knex, post.id), ['boundary-new-tag', 'slug1']);

            const news = await knex('news').where('post_id', post.id);
            assert.deepEqual(
                news.map((row) => row.keywords),
                ['boundary,news'],
            );
            const fields = await knex('custom_fields').where('post_id', post.id);
            assert.deepEqual(
                fields.map(({ key, value }) => ({ key, value })),
                [{ key: 'boundary-key', value: 'boundary-value' }],
            );
        });

        it('saves and destroys a parent that has no relation values set', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const author = await knex('authors').orderBy('id').first();

            const saved = await bookshelf.transaction((transacting) => {
                return Post.forge({ title: 'no-relations', author_id: author.id }).save(null, {
                    transacting,
                });
            });

            assert.equal((await postBy(knex, 'no-relations')).id, saved.id);
            assert.deepEqual(await tagSlugsFor(knex, saved.id), []);
            assert.deepEqual(await knex('news').where('post_id', saved.id), []);
            assert.deepEqual(await knex('custom_fields').where('post_id', saved.id), []);

            await bookshelf.transaction((transacting) => {
                return Post.forge({ id: saved.id }).destroy({ transacting });
            });

            assert.equal(await postBy(knex, 'no-relations'), undefined);
        });

        it('destroys hasOne, hasMany and pivot rows when a fetched parent is destroyed', async function () {
            const { bookshelf, Post } = setupModels(
                knex,
                {},
                { relationshipConfig: { author: { destroyRelated: false } } },
            );
            const author = await knex('authors').orderBy('id').first();
            const tag = await knex('tags').where('slug', 'slug1').first();

            const saved = await bookshelf.transaction((transacting) => {
                return Post.forge({
                    title: 'destroy-fetched',
                    author_id: author.id,
                    tags: [{ id: tag.id }],
                    news: { keywords: 'destroy,news' },
                    custom_fields: [{ key: 'destroy-key', value: 'destroy-value' }],
                }).save(null, { transacting });
            });

            assert.deepEqual(await tagSlugsFor(knex, saved.id), ['slug1']);
            assert.equal((await knex('news').where('post_id', saved.id)).length, 1);
            assert.equal((await knex('custom_fields').where('post_id', saved.id)).length, 1);

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: saved.id }).fetch({ transacting });
                return model.destroy({ transacting });
            });

            assert.equal(await postBy(knex, 'destroy-fetched'), undefined);
            assert.deepEqual(await knex('posts_tags').where('post_id', saved.id), []);
            assert.deepEqual(await knex('news').where('post_id', saved.id), []);
            assert.deepEqual(await knex('custom_fields').where('post_id', saved.id), []);
            assert.equal((await knex('tags').where('id', tag.id).first()).slug, 'slug1');
            assert.equal((await knex('authors').where('id', author.id).first()).name, author.name);
        });

        it('rejects destroying a fetched parent whose belongsTo relation keeps destroyRelated', async function () {
            // Known limitation: with the default destroyRelated: true, destroying a fetched parent
            // also deletes its belongsTo target, which the parent row still references. Consumers
            // set destroyRelated: false on belongsTo relations, as in the test above.
            const { bookshelf, Post } = setupModels(knex);
            const author = await knex('authors').orderBy('id').first();

            const saved = await bookshelf.transaction((transacting) => {
                return Post.forge({ title: 'destroy-belongs-to', author_id: author.id }).save(
                    null,
                    {
                        transacting,
                    },
                );
            });
            const before = await snapshot(knex);

            await assert.rejects(
                bookshelf.transaction(async (transacting) => {
                    const model = await Post.forge({ id: saved.id }).fetch({ transacting });
                    return model.destroy({ transacting });
                }),
                {
                    errorType: 'BookshelfRelationsError',
                    code: 'UPDATE_RELATION',
                    context: { key: 'author', tableName: 'posts', method: 'setBelongsTo' },
                },
            );

            assert.deepEqual(await snapshot(knex), before);
        });

        it('updates the existing hasOne relation when properties are passed without an id', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'Second Post');
            const [existingNews] = await knex('news').where('post_id', post.id);

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ news: { keywords: 'matched,by,parent' } }, { transacting });
            });

            const news = await knex('news').where('post_id', post.id);
            assert.equal(news.length, 1);
            assert.equal(news[0].id, existingNews.id);
            assert.equal(news[0].keywords, 'matched,by,parent');
        });

        it('inserts a hasOne relation when the parent has none and no id is passed', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'First Post');

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({
                    transacting,
                    withRelated: ['news'],
                });
                return model.save(
                    { news: { keywords: 'fresh,news' } },
                    { transacting, withRelated: ['news'] },
                );
            });

            const news = await knex('news').where('post_id', post.id);
            assert.deepEqual(
                news.map((row) => row.keywords),
                ['fresh,news'],
            );
        });

        it('rejects a relation that is not defined on the model', async function () {
            const { bookshelf, Post } = setupModels(knex, {}, { relationships: ['missing'] });
            const author = await knex('authors').orderBy('id').first();
            const before = await snapshot(knex);

            await assert.rejects(
                bookshelf.transaction((transacting) => {
                    return Post.forge({
                        title: 'unknown-relation',
                        author_id: author.id,
                        missing: [{ id: 1 }],
                    }).save(null, { transacting });
                }),
                {
                    errorType: 'BookshelfRelationsError',
                    code: 'UNKNOWN_RELATION',
                    message: 'No relation found.',
                },
            );

            assert.deepEqual(await snapshot(knex), before);
        });

        it('rejects a belongsToMany foreign key that does not match a target', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'Second Post');
            const { maxId } = await knex('tags').max('id as maxId').first();
            const before = await snapshot(knex);

            await assert.rejects(
                bookshelf.transaction(async (transacting) => {
                    const model = await Post.forge({ id: post.id }).fetch({ transacting });
                    return model.save(
                        { title: 'not-saved', tags: [{ tag_id: maxId + 1000 }] },
                        { transacting },
                    );
                }),
                {
                    errorType: 'BookshelfRelationsError',
                    message: 'Cannot find matching target by foreign key.',
                },
            );

            assert.deepEqual(await snapshot(knex), before);
        });

        it('attaches an existing belongsToMany target referenced by foreign key', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'First Post');
            const tag = await knex('tags').where('slug', 'slug2').first();

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ tags: [{ tag_id: tag.id }] }, { transacting });
            });

            assert.deepEqual(await tagSlugsFor(knex, post.id), ['slug2']);
        });

        it('rolls back the parent and nested inserts when a later relation fails validation', async function () {
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
    });

    describe('plugin options', function () {
        it('editRelations: false links related records by id without editing them', async function () {
            const { bookshelf, Post } = setupModels(
                knex,
                { editRelations: false },
                { relationshipConfig: { news: { editable: true } } },
            );
            const post = await postBy(knex, 'Second Post');
            const tag = await knex('tags').where('slug', 'slug1').first();

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save(
                    {
                        tags: [{ id: tag.id, slug: 'not-edited' }],
                        news: { keywords: 'editable,override' },
                    },
                    { transacting },
                );
            });

            assert.equal((await knex('tags').where('id', tag.id).first()).slug, 'slug1');
            assert.deepEqual(await tagSlugsFor(knex, post.id), ['slug1']);
            const news = await knex('news').where('post_id', post.id).first();
            assert.equal(news.keywords, 'editable,override');
        });

        it('extendChanged stores attached and detached belongsToMany targets on the parent', async function () {
            const { bookshelf, Post } = setupModels(knex, { extendChanged: '_changed' });
            const post = await postBy(knex, 'Second Post');
            const slug1 = await knex('tags').where('slug', 'slug1').first();
            const slug2 = await knex('tags').where('slug', 'slug2').first();

            const saved = await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save(
                    { tags: [{ id: slug1.id }, { slug: 'changed-new-tag' }] },
                    { transacting },
                );
            });

            const changed = saved._changed.tags;
            assert.deepEqual(
                changed.attached.map((tag) => tag.get('slug')),
                ['changed-new-tag'],
            );
            assert.deepEqual(
                changed.detached.map((tag) => tag.id),
                [slug2.id],
            );
        });

        it('does not record changes without extendChanged', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'Second Post');

            const saved = await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ tags: [] }, { transacting });
            });

            const recorded = Object.keys(saved).filter((prop) => {
                const value = saved[prop];
                return value && typeof value === 'object' && value.tags && 'detached' in value.tags;
            });
            assert.deepEqual(recorded, []);
            assert.deepEqual(await tagSlugsFor(knex, post.id), []);
        });

        it('attachPreviousRelations stores the belongsToMany targets from before the update', async function () {
            const { bookshelf, Post } = setupModels(knex, { attachPreviousRelations: true });
            const post = await postBy(knex, 'Second Post');

            const saved = await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ tags: [{ slug: 'replacement-tag' }] }, { transacting });
            });

            const previous = saved._previousRelations.tags.map((tag) => tag.get('slug'));
            assert.deepEqual(previous.toSorted(), ['slug1', 'slug2']);
            assert.deepEqual(await tagSlugsFor(knex, post.id), ['replacement-tag']);
        });

        it('does not attach previous relations by default', async function () {
            const { bookshelf, Post } = setupModels(knex);
            const post = await postBy(knex, 'Second Post');

            const saved = await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ tags: [{ slug: 'replacement-tag' }] }, { transacting });
            });

            assert.equal(saved._previousRelations, undefined);
        });

        it('allowedOptions forwards only the listed query options to related model queries', async function () {
            const { bookshelf, Post, savedOptions } = setupModels(knex, {
                allowedOptions: ['context', 'importing'],
            });
            const post = await postBy(knex, 'Second Post');
            const context = { user: 'boundary-user' };

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save(
                    { tags: [{ slug: 'allowed-options-tag' }], news: { keywords: 'allowed' } },
                    { transacting, context, importing: true, ignoredOption: 'not allowed' },
                );
            });

            assert.equal(savedOptions.tags.length, 1);
            assert.equal(savedOptions.news.length, 1);
            for (const options of [...savedOptions.tags, ...savedOptions.news]) {
                assert.ok(options.transacting);
                assert.deepEqual(options.context, context);
                assert.equal(options.importing, true);
                assert.equal(options.ignoredOption, undefined);
            }
        });

        it('does not forward query options to related model queries by default', async function () {
            const { bookshelf, Post, savedOptions } = setupModels(knex);
            const post = await postBy(knex, 'Second Post');

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save(
                    { tags: [{ slug: 'default-options-tag' }] },
                    { transacting, context: { user: 'boundary-user' } },
                );
            });

            assert.equal(savedOptions.tags.length, 1);
            assert.ok(savedOptions.tags[0].transacting);
            assert.equal(savedOptions.tags[0].context, undefined);
        });

        it('hooks.belongsToMany runs the global before and after hooks', async function () {
            const calls = [];
            const { bookshelf, Post } = setupModels(knex, {
                hooks: {
                    belongsToMany: {
                        before(collection, data, options) {
                            calls.push({
                                hook: 'before',
                                data,
                                transacting: !!options.transacting,
                            });
                        },
                        after(existing, targets, options) {
                            calls.push({
                                hook: 'after',
                                slugs: targets.map((tag) => tag.get('slug')).toSorted(),
                                transacting: !!options.transacting,
                            });
                        },
                    },
                },
            });
            const post = await postBy(knex, 'First Post');
            const tag = await knex('tags').where('slug', 'slug1').first();

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                return model.save({ tags: [{ id: tag.id }] }, { transacting });
            });

            assert.deepEqual(calls, [
                { hook: 'before', data: { post_id: post.id, tag_id: tag.id }, transacting: true },
                { hook: 'after', slugs: ['slug1'], transacting: true },
            ]);
        });
    });

    describe('manual mode (autoHook: false)', function () {
        it('replaces belongsToMany relations as in the README example without saving the parent', async function () {
            const pluginOptions = { autoHook: false };
            const { bookshelf, Post } = setupModels(knex, pluginOptions);
            const post = await postBy(knex, 'Second Post');
            const tag = await knex('tags').where('slug', 'slug2').first();

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                model.set('title', 'unsaved parent change');

                await bookshelf.manager.updateRelations(
                    { model, relations: { tags: [{ id: tag.id }] }, pluginOptions },
                    { transacting },
                );
            });

            assert.deepEqual(await tagSlugsFor(knex, post.id), ['slug2']);
            assert.equal((await knex('posts').where('id', post.id).first()).title, 'Second Post');
        });

        it('inserts new targets and forwards allowed options passed as pluginOptions', async function () {
            const { bookshelf, Post, savedOptions } = setupModels(knex, { autoHook: false });
            const post = await postBy(knex, 'First Post');
            const tag = await knex('tags').where('slug', 'slug1').first();
            const context = { source: 'manual-relations' };

            await bookshelf.transaction(async (transacting) => {
                const model = await Post.forge({ id: post.id }).fetch({ transacting });
                await bookshelf.manager.updateRelations(
                    {
                        model,
                        relations: {
                            tags: [{ id: tag.id }, { slug: 'manual-new-tag' }],
                            news: { keywords: 'manual,news' },
                        },
                        pluginOptions: { allowedOptions: ['context'] },
                    },
                    { transacting, context },
                );
            });

            assert.deepEqual(await tagSlugsFor(knex, post.id), ['manual-new-tag', 'slug1']);
            assert.equal(
                (await knex('news').where('post_id', post.id).first()).keywords,
                'manual,news',
            );
            assert.equal(savedOptions.tags.length, 1);
            assert.deepEqual(savedOptions.tags[0].context, context);
        });

        it('rolls back manual relation writes with the rest of the transaction', async function () {
            const { bookshelf, Post } = setupModels(knex, { autoHook: false });
            const post = await postBy(knex, 'First Post');
            const before = await snapshot(knex);
            const rollback = new Error('caller rejects the transaction');

            await assert.rejects(
                bookshelf.transaction(async (transacting) => {
                    const model = await Post.forge({ id: post.id }).fetch({ transacting });
                    await model.save({ title: 'rolled-back title' }, { transacting });
                    await bookshelf.manager.updateRelations(
                        { model, relations: { tags: [{ slug: 'rolled-back-manual-tag' }] } },
                        { transacting },
                    );
                    assert.deepEqual(
                        (await transacting('posts_tags').where('post_id', post.id)).length,
                        1,
                    );
                    throw rollback;
                }),
                (error) => {
                    // Surface in-transaction assertion failures instead of a validator mismatch.
                    if (error !== rollback) {
                        throw error;
                    }
                    return true;
                },
            );

            assert.deepEqual(await snapshot(knex), before);
        });

        it('throws synchronously for a relation that is not defined on the model', async function () {
            const { bookshelf, Post } = setupModels(knex, { autoHook: false });
            const post = await postBy(knex, 'First Post');
            const model = await Post.forge({ id: post.id }).fetch();

            // Manual mode throws synchronously, before any promise is returned.
            assert.throws(
                () =>
                    bookshelf.manager.updateRelations({
                        model,
                        relations: { missing: [{ id: 1 }] },
                    }),
                {
                    errorType: 'BookshelfRelationsError',
                    code: 'UNKNOWN_RELATION',
                    message: 'No relation type.',
                },
            );
        });
    });
});
