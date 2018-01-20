'use strict';

process.env.NODE_ENV = 'testing-mysql';

const _ = require('lodash');
const Promise = require('bluebird');
const models = require('../_database1/models');
const testUtils = require('../utils');
const ObjectId = require('bson-objectid');

let generatePost = function generatePost() {
    return {
        title: Math.random().toString(36).substring(2),
        mobiledoc: Array(65537).join('x'),
        html: Array(65537).join('x'),
        plaintext: Array(65537).join('x'),
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
        tags: [
            {
                slug: Math.random().toString(36).substring(2)
            },
            {
                slug: Math.random().toString(36).substring(2)
            }
        ],
        authors: [
            {
                name: 'kate'
            },
            {
                name: 'frank'
            }
        ],
        meta: [
            {
                key: 'meta_title',
                value: 'lol'
            },
            {
                key: 'meta_description',
                value: 'lol'
            }
        ]
    };
};

describe.only('[Integration] Perf (1) - MySQL only', function () {
    let addedPosts = [];
    this.timeout(1000 * 60 * 10);

    before(function () {
        return testUtils.database.reset({dbName: '_database1'})
            .then(function () {
                return testUtils.database.init({dbName: '_database1'});
            });
    });

    it('insert posts', function () {
        const posts = _.map(_.range(1000 * 3), generatePost);

        return Promise.each(posts, function (post) {
            return models.Post.add(post)
                .then(function (post) {
                    addedPosts.push(post);
                });
        });
    });

    it('fetch one posts with all relations', function () {
        return models.Post.forge({id: addedPosts[0].id}).fetch({withRelated: ['tags', 'authors', 'meta']})
            .then(function (post) {
                post.related('tags').length.should.eql(2);
                post.related('authors').length.should.eql(2);
                post.related('meta').length.should.eql(2);
            });
    });

    it('fetch all posts with all relations', function () {
        return models.Post.fetchAll({withRelated: ['tags', 'authors', 'meta']})
            .then(function (result) {
                result.models[0].related('tags').length.should.eql(2);
                result.models[0].related('authors').length.should.eql(2);
                result.models[0].related('meta').length.should.eql(2);
            });
    });

    it('edit and expect revisions', function () {
        return models.Post.edit({
            tags: [],
            authors: [
                {
                    name: 'Ralf'
                }
            ]
        }, {id: addedPosts[0].id}).then(function (post) {
            post.related('tags').models.length.should.eql(0);
            post.related('authors').models.length.should.eql(1);

            return models.Post.fetchAll({withRelated: ['revisions']});
        }).then(function (result) {
            result.models[0].related('revisions').models.length.should.eql(1);
        });
    });
});