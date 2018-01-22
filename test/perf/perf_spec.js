'use strict';

process.env.NODE_ENV = 'testing-mysql';

const _ = require('lodash');
const Promise = require('bluebird');
const models = require('../_database/models');
const testUtils = require('../utils');

let generatePost = function generatePost() {
    return {
        title: Math.random().toString(36).substring(2),
        a: Math.random().toString(36).substring(2),
        b: Math.random().toString(36).substring(2),
        c: Math.random().toString(36).substring(2),
        d: Math.random().toString(36).substring(2),
        e: Math.random().toString(36).substring(2),
        f: Math.random().toString(36).substring(2),
        g: Math.random().toString(36).substring(2),
        h: Math.random().toString(36).substring(2),
        i: Math.random().toString(36).substring(2),
        j: Math.random().toString(36).substring(2),
        content: Array(65537).join('x'),
        plaintext: Array(65537).join('x'),
        tags: [
            {
                slug: Math.random().toString(36).substring(2)
            },
            {
                slug: Math.random().toString(36).substring(2)
            }
        ],
        news: {
            keywords: Math.random().toString(36).substring(5) + ',' + Math.random().toString(36).substring(7) + ',' + Math.random().toString(36).substring(3)
        },
        custom_fields: [
            {
                key: Math.random().toString(36).substring(5),
                value: Math.random().toString(36).substring(5)
            },
            {
                key: Math.random().toString(36).substring(5),
                value: Math.random().toString(36).substring(5)
            }
        ],
        author: {
            name: Math.random().toString(36).substring(5)
        }
    };
};

describe('[Integration] Perf - MySQL only', function () {
    let addedPosts = [];
    this.timeout(1000 * 60 * 10);

    before(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            });
    });

    it('insert posts', function () {
        const posts = _.map(_.range(1), generatePost);

        return Promise.each(posts, function (post) {
            return models.Post.add(post)
                .then(function (post) {
                    addedPosts.push(post);
                });
        });
    });

    it('fetch one posts with all relations', function () {
        return models.Post.forge({id: addedPosts[0].id}).fetch({withRelated: ['tags', 'news', 'custom_fields', 'author']})
            .then(function (post) {
                post.related('tags').length.should.eql(2);
                post.related('custom_fields').length.should.eql(2);
                should.exist(post.related('news').get('keywords'));
                should.exist(post.related('author').get('name'));
            });
    });

    it('fetch 10 posts', function () {
        return models.Post.query(function (qb) {
            qb.limit(10);
        }).fetchAll({withRelated: ['tags', 'news', 'custom_fields', 'author']})
            .then(function (result) {
                result.models.length.should.eql(10);
            });
    });

    it('fetch all posts with all relations', function () {
        return models.Post.fetchAll({withRelated: ['tags', 'news', 'custom_fields', 'author']});
    });

    it('edit a single post with relations', function () {
        return models.Post.edit({
            tags: [],
            author: {
                name: 'Ralf'
            }
        }, {id: 100}).then(function (post) {
            post.related('tags').models.length.should.eql(0);
            post.related('author').toJSON().name.should.eql('Ralf');
        });
    });
});