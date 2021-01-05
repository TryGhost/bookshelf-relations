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
                    posts.models[1].related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
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
            require('ghost-ignition').debug('test')('begin');
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
        it('editPostOnlyWithNews', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me'
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                    return testUtils.database.getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                        });
                }
            });
        });

        it('editPostOnlyWithoutNews', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,
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

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                        });
                }
            });
        });

        it('editNewsAndPost', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me',
                    news: {
                        id: testUtils.fixtures.getAll().posts[1].news.id,
                        keywords: 'future,something'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().keywords.should.eql('future,something');

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql('future,something');
                        });
                }
            });
        });

        it('withRelated', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    news: {
                        id: testUtils.fixtures.getAll().posts[1].news.id,
                        keywords: testUtils.fixtures.getAll().posts[1].news.keywords
                    }
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.related('news').toJSON().keywords
                        .should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                }
            });
        });
        it('addNewsToPostWithNews', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me',
                    news: {
                        keywords: 'self,this'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('news').toJSON().keywords.should.eql('self,this');

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql('self,this');
                        });
                }
            });
        });

        it('addNewsToPostWithoutNews', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,
                values: {
                    news: {
                        keywords: 'self,this'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    result.related('news').toJSON().keywords.should.eql('self,this');

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(2);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);

                            result[1].post_id.should.eql(1);
                            result[1].keywords.should.eql('self,this');
                        });
                }
            });
        });

        it('setNull', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    news: null
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: function (result) {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                        });
                }
            });
        });

        it('setUndefined', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    news: undefined
                },
                options: {
                    withRelated: ['news']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                    return testUtils.database
                        .getConnection()('news')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                        });
                }
            });
        });

        it('setEmptyNewsForPostWithNews', function () {
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

        it('setEmptyNewsForPostWithoutNews', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,
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

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                            result[0].post_id.should.eql(2);
                            result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                        });
                }
            });
        });
    });
});
