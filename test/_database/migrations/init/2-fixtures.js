const Promise = require('bluebird');
const models = require('../../models');
const testUtils = require('../../../utils');

exports.up = function up() {
    const posts = [
        {
            title: 'First Post',
            author: {
                name: 'Alf'
            }
        },
        {
            title: 'Second Post',
            tags: [
                {
                    slug: 'slug1'
                },
                {
                    slug: 'slug2'
                }
            ],
            news: {
                keywords: 'future,world,sun-down'
            },
            custom_fields: [
                {
                    key: 'field1',
                    value: 'value1'
                },
                {
                    key: 'field2',
                    value: 'value2'
                }
            ],
            author: {
                name: 'Mozart'
            }
        }
    ];

    return Promise.each(posts, function (post) {
        return models.Post.add(post).then(function (result) {
            testUtils.fixtures.add('posts', result.toJSON({withRelated: ['tags', 'news', 'customFields', 'author']}));
        });
    });
};