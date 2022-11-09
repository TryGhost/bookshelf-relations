const models = require('../../models');
const testUtils = require('../../../utils');

exports.up = async function up() {
    const newsletters = [{
        title: 'Best newsletter ever'
    }];

    for (const newsletter of newsletters) {
        const addedNewsletter = await models.Newsletter.add(newsletter);
        testUtils.fixtures.add('newsletters', addedNewsletter.toJSON());
    }

    const bestNewsletter = testUtils.fixtures.getAll('newsletters').find(n => n.title === 'Best newsletter ever');
    const posts = [
        {
            title: 'First Post',
            author: {
                name: 'Alf'
            },
            newsletter: {
                id: bestNewsletter.id
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
