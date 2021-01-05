const testUtils = require('../utils');

describe('[Integration] BelongsTo: Posts/Author', function () {
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
                options: {withRelated: ['author']},
                expectSuccess: (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[0].author.name);
                    posts.models[1].related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });
    });

    describe('add', function () {
        it('addWithUnknownId', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'post-title',
                    author: {
                        id: 11111,
                        name: 'test-unknown'
                    }
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('post-title');
                    result.related('author').toJSON().should.containEql({
                        name: 'test-unknown'
                    });

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(3);
                        });
                }
            });
        });
    });

    describe('destroy', function () {
        it('existingPostWithAuthor', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 2,
                expectSuccess: (result) => {
                    result.related('author').toJSON().should.eql({});

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });
    });

    describe('edit', function () {
        it('editPostOnly', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me'
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('author').toJSON()
                        .should.eql(testUtils.fixtures.getAll().posts[1].author);

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });

        it('editPostAndAuthor', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'lala',
                    author: {
                        id: testUtils.fixtures.getAll().posts[1].author.id,
                        name: 'Peter'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('lala');
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name.should.eql('Peter');

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                            result[0].name.should.eql('Alf');
                            result[1].name.should.eql('Peter');
                        });
                }
            });
        });

        it('authorWithUnknownId', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: {
                        id: 20,
                        name: 'Frank'
                    }
                },
                expectSuccess: (result) => {
                    result.related('author').toJSON().id.should.not.eql(20);
                    result.related('author').toJSON().name.should.eql('Frank');

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(3);
                            result[0].name.should.eql('Alf');
                            result[1].name.should.eql('Mozart');
                            result[2].name.should.eql('Frank');
                        });
                }
            });
        });

        it('overrideExistingAuthor', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: {
                        name: 'Karl'
                    }
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.not.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name.should.eql('Karl');

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(3);
                            result[0].name.should.eql('Alf');
                            result[1].name.should.eql('Mozart');
                            result[2].name.should.eql('Karl');
                        });
                }
            });
        });

        it('setNull', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: null
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });

        it('setUndefined', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,

                values: {
                    author: undefined
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });

        it('changeAuthor', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,

                values: {
                    author: {
                        id: testUtils.fixtures.getAll().posts[1].author.id
                    }
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    result.related('author').toJSON().name.should.eql('Mozart');

                    return testUtils.database
                        .getConnection()('authors')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });
    });
});
