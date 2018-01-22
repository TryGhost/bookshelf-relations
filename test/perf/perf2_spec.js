'use strict';

process.env.NODE_ENV = 'testing-mysql';

const _ = require('lodash');
const Promise = require('bluebird');
const models = require('../_database2/models');
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

describe('[Integration] Perf (1) - MySQL only', function () {
    let addedPosts = [];
    this.timeout(1000 * 60 * 10);
    this.slow(1);

    before(function () {
        return testUtils.database.reset({dbName: '_database2'})
            .then(function () {
                return testUtils.database.init({dbName: '_database2'});
            });
    });

    it('insert posts', function () {
        const posts = _.map(_.range(3000), generatePost);

        return Promise.each(posts, function (post) {
            return models.Post.add(post)
                .then(function (post) {
                    addedPosts.push(post);
                });
        });
    });

    it('fetch 10 posts', function () {
        return models.Post.query(function (qb) {
            qb.limit(10);
            qb.select(['title', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
        }).fetchAll()
            .then(function (result) {
                result.models.length.should.eql(10);
            });
    });
});