const models = require('../../models');
const testUtils = require('../../../utils');

exports.up = async function up() {
    const posts = [
        {
            title: 'First Post',
            author: {
                name: 'Alf'
            },
            newsletter: {
                title: 'Best newsletter ever'
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
        },
        {
            title: 'Third Post',
            author: {
                id: 1
            },
            events: [{
                type: 'Created'
            }, {
                type: 'Destroyed'
            }]
        }
    ];

    for (const post of posts) {
        const addedPost = await models.Post.add(post);
        testUtils.fixtures.add('posts', addedPost.toJSON({withRelated: ['tags', 'news', 'customFields', 'author', 'events']}));
    }
};
