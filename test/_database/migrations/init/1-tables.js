exports.up = function up(options) {
    let connection = options.connection;
    let schema = connection.schema;

    return schema.createTable('authors', function (table) {
        table.increments('id').primary().nullable(false);
        table.string('name', 100).nullable(false);
    }).createTable('posts', function (table) {
        table.increments('id').primary().nullable(false);
        table.string('title');
        table.integer('author_id').unsigned().nullable(false).references('authors.id');
    }).createTable('tags', function (table) {
        table.increments('id').primary().nullable(false);
        table.string('slug', 191).unique().nullable(false);
    }).createTable('posts_tags', function (table) {
        table.increments('id').primary().nullable(false);
        table.integer('post_id').unsigned().nullable(false).references('posts.id');
        table.integer('tag_id').unsigned().nullable(false).references('tags.id');
        table.integer('sort_order').nullable(false).defaultTo(0);
    }).createTable('news', function (table) {
        table.increments('id').primary().nullable(false);
        table.string('keywords', 100).nullable(true);
        table.integer('post_id').unsigned().unique().nullable(false).references('posts.id');
    }).createTable('custom_fields', function (table) {
        table.increments('id').primary().nullable(false);
        table.string('key', 100).nullable(false);
        table.string('value', 255).nullable(true);
        table.integer('post_id').unsigned().nullable(false).references('posts.id');
        table.unique(['key', 'post_id']);
    });
};