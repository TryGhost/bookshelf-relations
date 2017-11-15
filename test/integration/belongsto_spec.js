'use strict';

const _ = require('lodash');
const models = require('../_database/models');
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
            return models.Post.fetchAll({withRelated: ['author']})
                .then(function (posts) {
                    posts.length.should.eql(2);
                    posts.models[0].related('author').toJSON().name.should.eql(testUtils.fixtures.getAll().posts[0].author.name);
                    posts.models[1].related('author').toJSON().name.should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    return testUtils.database.getConnection()('authors');
                })
                .then(function (result) {
                    result.length.should.eql(2);
                });
        });
    });

    describe('destroy', function () {
        const destroyCases = {
            existingPostWithAuthor: function () {
                return {
                    expect: function (result) {
                        result.related('author').toJSON().should.eql({});

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            }
        };

        return _.each(Object.keys(destroyCases), function (key) {
            it(key, function () {
                let destroyCase = destroyCases[key]();

                return models.Post.destroy({id: destroyCase.id || 2})
                    .then(function (result) {
                        return destroyCase.expect(result);
                    })
                    .catch(function (err) {
                        if (err instanceof should.AssertionError) {
                            throw err;
                        }

                        return destroyCase.expect(err);
                    });
            });
        });
    });

    describe('edit', function () {
        const editCases = {
            editPostOnly: function () {
                return {
                    options: {
                        withRelated: ['author']
                    },
                    values: {
                        title: 'only-me'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('author').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].author);

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            editPostAndAuthor: function () {
                return {
                    values: {
                        title: 'lala',
                        author: {
                            id: testUtils.fixtures.getAll().posts[1].author.id,
                            name: 'Peter'
                        }
                    },
                    expect: function (result) {
                        result.get('title').should.eql('lala');
                        result.related('author').toJSON().id.should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                        result.related('author').toJSON().name.should.eql('Peter');

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(2);
                                result[0].name.should.eql('Alf');
                                result[1].name.should.eql('Peter');
                            });
                    }
                }
            },
            overrideExistingAuthor: function () {
                return {
                    values: {
                        author: {
                            name: 'Karl'
                        }
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('author').toJSON().id.should.not.eql(testUtils.fixtures.getAll().posts[1].author.id);
                        result.related('author').toJSON().name.should.eql('Karl');

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(3);
                                result[0].name.should.eql('Alf');
                                result[1].name.should.eql('Mozart');
                                result[2].name.should.eql('Karl');
                            });
                    }
                }
            },
            setNull: function () {
                return {
                    options: {
                        withRelated: ['author']
                    },
                    values: {
                        author: null
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('author').toJSON().id.should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                        result.related('author').toJSON().name.should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            setUndefined: function () {
                return {
                    options: {
                        withRelated: ['author']
                    },
                    values: {
                        author: undefined
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('author').toJSON().id.should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                        result.related('author').toJSON().name.should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                        return testUtils.database.getConnection()('authors')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            }
        };

        return _.each(Object.keys(editCases), function (key) {
            it(key, function () {
                let editCase = editCases[key]();

                return models.Post.edit(_.merge({id: editCase.id || 2}, editCase.values), editCase.options || {})
                    .then(function (result) {
                        return editCase.expect(result);
                    })
                    .catch(function (err) {
                        if (err instanceof should.AssertionError) {
                            throw err;
                        }

                        return editCase.expect(err);
                    });
            });
        });
    });
});