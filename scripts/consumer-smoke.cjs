const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const os = require('node:os');
const path = require('node:path');

const repository = path.resolve(__dirname, '..');

function unpackPackage(directory) {
    const [packed] = JSON.parse(
        execFileSync(
            'npm',
            [
                'pack',
                '--ignore-scripts',
                '--json',
                '--pack-destination',
                directory,
                '--cache',
                path.join(directory, 'npm-cache'),
            ],
            { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
        ),
    );
    assert.equal(packed.filename, path.basename(packed.filename));
    const archive = path.join(directory, packed.filename);
    const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
    assert(
        entries.every((entry) => entry.startsWith('package/') && !entry.split('/').includes('..')),
    );
    const listing = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8' })
        .trim()
        .split('\n');
    assert(
        listing.every((entry) => entry.startsWith('-') || entry.startsWith('d')),
        'Archive must contain only regular files and directories',
    );
    execFileSync('tar', [
        '-xzf',
        archive,
        '-C',
        directory,
        '--no-same-owner',
        '--no-same-permissions',
    ]);
    return path.join(directory, 'package');
}

function prepareConsumer(directory) {
    const packageDirectory = unpackPackage(directory);
    const manifest = JSON.parse(
        fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'),
    );
    const source = JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'bookshelf-relations');
    assert.equal(manifest.version, source.version);
    assert.equal(manifest.main, 'index.js');
    for (const file of [
        'index.js',
        'errors.js',
        'lib/plugin.js',
        'lib/relations.js',
        'lib/detector.js',
        'lib/utils/strip-relational-values.js',
    ]) {
        assert(
            fs.statSync(path.join(packageDirectory, file)).isFile(),
            `Missing packed file: ${file}`,
        );
    }

    const modules = path.join(directory, 'node_modules');
    fs.mkdirSync(modules);
    fs.renameSync(packageDirectory, path.join(modules, manifest.name));
    // Only declared runtime dependencies and the consumer's peer/database harness
    // are visible to the packed library; other checkout dev dependencies stay hidden.
    const dependencies = new Map(Object.keys(manifest.dependencies).map((name) => [name, name]));
    dependencies.set('bookshelf', 'bookshelf');
    dependencies.set('knex', 'knex2');
    dependencies.set('better-sqlite3', 'better-sqlite3');
    for (const [name, installedName] of dependencies) {
        const target = path.join(modules, name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.symlinkSync(
            fs.realpathSync(path.join(repository, 'node_modules', installedName)),
            target,
            'dir',
        );
    }

    const consumer = createRequire(path.join(directory, 'package.json'));
    assert.equal(consumer('bookshelf/package.json').version, '1.2.0');
    assert.equal(consumer('knex/package.json').version, '2.4.2');
    for (const name of Object.keys(source.devDependencies)) {
        if (!dependencies.has(name)) {
            assert.throws(() => consumer.resolve(name), { code: 'MODULE_NOT_FOUND' });
        }
    }
    assert.equal(typeof consumer('bookshelf-relations'), 'function');
    return consumer;
}

async function exerciseConsumer(consumer) {
    const connection = consumer('knex')({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
        pool: { min: 1, max: 1 },
    });
    try {
        await connection.schema
            .createTable('posts', (table) => {
                table.increments('id');
                table.string('title').notNullable();
            })
            .createTable('tags', (table) => {
                table.increments('id');
                table.string('name').notNullable().unique();
            })
            .createTable('posts_tags', (table) => {
                table.integer('post_id').notNullable().references('posts.id');
                table.integer('tag_id').notNullable().references('tags.id');
                table.primary(['post_id', 'tag_id']);
            })
            .createTable('comments', (table) => {
                table.increments('id');
                table.integer('post_id').notNullable().references('posts.id');
                table.string('body').notNullable();
            });

        const bookshelf = consumer('bookshelf')(connection);
        bookshelf.plugin(consumer('bookshelf-relations'));
        const Tag = bookshelf.Model.extend({ tableName: 'tags' });
        const Comment = bookshelf.Model.extend({ tableName: 'comments' });
        const Post = bookshelf.Model.extend({
            tableName: 'posts',
            relationships: ['tags', 'comments'],
            tags() {
                return this.belongsToMany(Tag, 'posts_tags', 'post_id', 'tag_id');
            },
            comments() {
                return this.hasMany(Comment, 'post_id');
            },
        });
        const snapshot = async () => {
            const rows = {};
            for (const table of ['posts', 'tags', 'posts_tags', 'comments']) {
                rows[table] = await connection(table)
                    .select('*')
                    .orderBy(table === 'posts_tags' ? 'tag_id' : 'id');
            }
            return rows;
        };

        const post = await bookshelf.transaction((transacting) =>
            Post.forge({
                title: 'Created',
                tags: [{ name: 'First' }, { name: 'Second' }],
                comments: [{ body: 'Keep' }, { body: 'Remove' }],
            }).save(null, { transacting }),
        );
        const created = await Post.forge({ id: post.id }).fetch({
            withRelated: ['tags', 'comments'],
        });
        assert.deepEqual(created.related('tags').pluck('name').toSorted(), ['First', 'Second']);
        assert.deepEqual(created.related('comments').pluck('body').toSorted(), ['Keep', 'Remove']);
        const firstTag = created.related('tags').find((tag) => tag.get('name') === 'First');
        const firstComment = created
            .related('comments')
            .find((comment) => comment.get('body') === 'Keep');

        await bookshelf.transaction((transacting) =>
            Post.forge({ id: post.id }).save(
                {
                    title: 'Edited',
                    tags: [{ id: firstTag.id, name: 'Renamed' }, { name: 'Third' }],
                    comments: [{ id: firstComment.id, body: 'Edited comment' }],
                },
                { transacting },
            ),
        );
        const edited = await Post.forge({ id: post.id }).fetch({
            withRelated: ['tags', 'comments'],
        });
        assert.equal(edited.get('title'), 'Edited');
        assert.deepEqual(edited.related('tags').pluck('name').toSorted(), ['Renamed', 'Third']);
        assert.deepEqual(edited.related('comments').pluck('body'), ['Edited comment']);
        assert.equal((await connection('comments')).length, 1, 'Removed child must be deleted');

        const beforeFailure = await snapshot();
        await assert.rejects(
            bookshelf.transaction((transacting) =>
                Post.forge({
                    title: 'Must roll back',
                    tags: [{ name: 'Must also roll back' }],
                    comments: [{ body: null }],
                }).save(null, { transacting }),
            ),
            { code: 'UPDATE_RELATION' },
        );
        assert.deepEqual(
            await snapshot(),
            beforeFailure,
            'Failed nested save must leave no partial writes',
        );

        await bookshelf.transaction((transacting) =>
            Post.forge({ id: post.id }).destroy({ transacting }),
        );
        assert.deepEqual(await connection('posts'), []);
        assert.deepEqual(await connection('posts_tags'), []);
        assert.deepEqual(await connection('comments'), []);
        assert.equal(
            (await connection('tags')).length,
            3,
            'Deleting a parent must preserve shared tags',
        );
    } finally {
        await connection.destroy();
    }
}

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bookshelf-consumer-'));
    try {
        await exerciseConsumer(prepareConsumer(directory));
        process.stdout.write('Packed consumer smoke passed with Bookshelf 1.2.0 and Knex 2.4.2.\n');
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

main().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
});
