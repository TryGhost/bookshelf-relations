'use strict';

exports.up = function up(options) {
    let connection = options.connection;
    let schema = connection.schema;

    return schema.createTable('authors', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('name', 100).unique().nullable(false);
    }).createTable('posts', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('title');
        table.text('mobiledoc', 'long');
        table.text('plaintext', 'long');
        table.text('html', 'long');
        table.string('a');
        table.string('b');
        table.string('c');
        table.string('d');
        table.string('e');
        table.string('f');
        table.string('g');
        table.string('h');
        table.string('i');
        table.string('j');
    }).createTable('tags', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('slug', 191).unique().nullable(false);
        table.string('name', 250).nullable(true);
        table.string('parent_id', 24).nullable(true).references('tags.id');
        table.index(['parent_id']);
    }).createTable('posts_tags', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('post_id', 24).nullable(false).references('posts.id');
        table.string('tag_id', 24).nullable(false).references('tags.id');
        table.integer('sort_order').defaultTo(0);
    }).createTable('meta', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('key', 100).nullable(true);
        table.text('value', 'medium').nullable(true);
        table.string('object_id', 24).nullable(false);
        table.index(['object_id']);
    }).createTable('tags_meta', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('key', 100).nullable(true);
        table.text('value', 'medium').nullable(true);
        table.string('object_id', 24).nullable(false);
        table.index(['object_id']);
    }).createTable('tags_nested', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('parent_id', 24).nullable(true);
        table.string('child_id', 24).nullable(true);
        table.index(['parent_id']);
    }).createTable('revisions', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.text('data', 'long').nullable(true);
        table.integer('is_active').nullable(false).defaultTo(0);
    }).createTable('posts_revisions', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('post_id', 24).nullable(false).references('posts.id');
        table.string('revision_id', 24).nullable(false).references('revisions.id');
    }).createTable('posts_authors', function (table) {
        table.string('id', 24).primary().nullable(false);
        table.string('post_id', 24).nullable(false).references('posts.id');
        table.string('author_id', 24).nullable(false).references('authors.id');
        // primary author/tag is always the first element in the array
        table.integer('sort_order', 24).nullable(false).defaultTo(0);
    });
};