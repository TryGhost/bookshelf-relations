const testUtils = require('../utils');

describe('[Integration] HasOne: Posts/News', function () {
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
                options: {withRelated: ['news']},
                expectSuccess: (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('news').toJSON().should.eql({});

                    const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === testUtils.fixtures.getAll().posts[1].id);
                    posts.models[1].related('news').toJSON().should.eql(newsItem);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });
    });

    describe('destroy', function () {
        it('existing post with news', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 2,
                expectSuccess: (result) => {
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });

        it('existing post without news', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 1,
                expectSuccess: (result) => {
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news').where('post_id', 1)
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });
    });

    describe('edit', function () {
        it('edits the post with news without touching news relation', function () {
            const post = testUtils.fixtures.getAll().posts[1];
            const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === post.id);

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    title: 'only-me'
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().should.eql(newsItem);

                    return testUtils.database.getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(post.id);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('edits the post without news without touching news relation', function () {
            const post = testUtils.fixtures.getAll().posts[0];
            const newsItem = testUtils.fixtures.getAll('news')[0];

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    title: 'only-me'
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('edits the post with news and NOT changing news relation', function () {
            const post = testUtils.fixtures.getAll().posts[1];
            const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === post.id);

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    title: 'only-me',
                    news: {
                        id: newsItem.id,
                        keywords: 'future,something'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().keywords.should.eql(newsItem.keywords);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('edits the post with news and NOT changing news relation using withRelated', function () {
            const post = testUtils.fixtures.getAll().posts[1];
            const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === post.id);

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    news: {
                        id: newsItem.id,
                        keywords: newsItem.keywords
                    }
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.related('news').toJSON().keywords
                        .should.eql(newsItem.keywords);
                }
            });
        });

        it('cannot add new news through post', function () {
            const post = testUtils.fixtures.getAll().posts[2];
            const newsItem = testUtils.fixtures.getAll('news')[0];

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    title: 'only-me',
                    news: {
                        keywords: 'self,this'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    should.equal(result.related('news').toJSON().keywords, undefined);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('cannot add new news to a post without news', function () {
            const post = testUtils.fixtures.getAll().posts[0];
            const newsItem = testUtils.fixtures.getAll('news')[0];

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    news: {
                        keywords: 'self,this'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(newsItem.post_id);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('setting null removes the relation', function () {
            const post = testUtils.fixtures.getAll().posts[1];
            const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === post.id);

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    news: null
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: function (result) {
                    result.get('title').should.eql(post.title);
                    result.related('news').toJSON().should.eql(newsItem);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(post.id);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('setting undefined keeps the relation', function () {
            const post = testUtils.fixtures.getAll().posts[1];
            const newsItem = testUtils.fixtures.getAll('news').find(n => n.post_id === post.id);

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    news: undefined
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(post.title);
                    result.related('news').toJSON().should.eql(newsItem);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(post.id);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });

        it('removes related news relation from the post with news', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    news: {}
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });

        it('does nothing when removing the news relation from the post without news', function () {
            const post = testUtils.fixtures.getAll().posts[0];
            const newsItem = testUtils.fixtures.getAll('news')[0];

            return testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    news: {}
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.related('news').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(newsItem.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(newsItem.keywords);
                        });
                }
            });
        });
    });
});
