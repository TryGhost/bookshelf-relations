const testUtils = require('../utils');

describe('[Integration] Mixed', function () {
    beforeEach(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            });
    });

    describe('fetch', function () {
        it('existing', function () {
            return testUtils.testPostModel({
                method: 'fetchAll',
                options: {withRelated: ['author', 'news', 'tags', 'custom_fields']},
                expectSuccess: (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('author').toJSON().should.eql(testUtils.fixtures.getAll().posts[0].author);
                    posts.models[1].related('author').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].author);

                    posts.models[0].related('news').toJSON().should.eql({});
                    posts.models[1].related('news').toJSON().should.eql(testUtils.fixtures.getAll('news')[0]);

                    posts.models[0].related('tags').length.should.eql(0);
                    posts.models[1].related('tags').length.should.eql(2);

                    posts.models[0].related('custom_fields').length.should.eql(0);
                    posts.models[1].related('custom_fields').length.should.eql(2);
                }
            });
        });
    });

    describe('edit', function () {
        it('editExistingRelationsAndPost', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me',
                    news: {
                        id: testUtils.fixtures.getAll('news')[0].id,
                        keywords: 'future,something'
                    },
                    tags: [
                        {
                            slug: 'football'
                        }
                    ],
                    author: {
                        name: 'Franz'
                    },
                    custom_fields: []
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().keywords.should.eql('future,world,sun-down');
                    result.related('author').toJSON().name.should.eql('Franz');
                    result.related('tags').models.length.should.eql(1);
                    result.related('tags').models[0].get('slug').should.eql('football');
                    result.related('custom_fields').models.length.should.eql(0);
                }
            });
        });
    });
});
