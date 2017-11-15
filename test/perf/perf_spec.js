'use strict';

process.env.NODE_ENV = 'testing-mysql';

const _ = require('lodash');
const Promise = require('bluebird');
const models = require('../_database/models');
const testUtils = require('../utils');

let generatePost = function generatePost() {
    return {
        title: Math.random().toString(36).substring(2),
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
    this.timeout(1000 * 60 * 5);

    before(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            });
    });

    it('insert posts', function () {
        const posts = _.map(_.range(5000), generatePost);

        return Promise.each(posts, function (post) {
            return models.Post.add(post);
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