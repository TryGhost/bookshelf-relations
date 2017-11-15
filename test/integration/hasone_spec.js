'use strict';

const _ = require('lodash');
const models = require('../_database/models');
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
            return models.Post.fetchAll({withRelated: ['news']})
                .then(function (posts) {
                    posts.length.should.eql(2);
                    posts.models[0].related('news').toJSON().should.eql({});
                    posts.models[1].related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                    return testUtils.database.getConnection()('news');
                })
                .then(function (result) {
                    result.length.should.eql(1);
                    result[0].post_id.should.eql(2);
                    result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                });
        });
    });

    describe('destroy', function () {
        const destroyCases = {
            existingPostWithNews: function () {
                return {
                    expect: function (result) {
                        result.related('news').toJSON().should.eql({});

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(0);
                            });
                    }
                }
            },
            existingPostWithoutTags: function () {
                return {
                    id: 1,
                    expect: function () {
                        return testUtils.database.getConnection()('news').where('post_id', 1)
                            .then(function (result) {
                                result.length.should.eql(0);
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
            editPostOnlyWithNews: function () {
                return {
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        title: 'only-me'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                            });
                    }
                }
            },
            editPostOnlyWithoutNews: function () {
                return {
                    id: 1,
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        title: 'only-me'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('news').toJSON().should.eql({});

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                            });
                    }
                }
            },
            editNewsAndPost: function () {
                return {
                    values: {
                        title: 'only-me',
                        news: {
                            id: testUtils.fixtures.getAll().posts[1].news.id,
                            keywords: 'future,something'
                        }
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('news').toJSON().keywords.should.eql('future,something');

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql('future,something');
                            });
                    }
                }
            },
            withRelated: function () {
                return {
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        news: {
                            id: testUtils.fixtures.getAll().posts[1].news.id,
                            keywords: testUtils.fixtures.getAll().posts[1].news.keywords
                        }
                    },
                    expect: function (result) {
                        result.related('news').toJSON().keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                    }
                }
            },
            addNewsToPostWithNews: function () {
                return {
                    values: {
                        title: 'only-me',
                        news: {
                            keywords: 'self,this'
                        }
                    },
                    expect: function (result) {
                        result.message.should.match(/unique/gi);

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                            });
                    }
                }
            },
            addNewsToPostWithoutNews: function () {
                return {
                    id: 1,
                    values: {
                        news: {
                            keywords: 'self,this'
                        }
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                        result.related('news').toJSON().keywords.should.eql('self,this');

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(2);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);

                                result[1].post_id.should.eql(1);
                                result[1].keywords.should.eql('self,this');
                            });
                    }
                }
            },
            setNull: function () {
                return {
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        news: null
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                            });
                    }
                }
            },
            setUndefined: function () {
                return {
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        news: undefined
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('news').toJSON().should.eql(testUtils.fixtures.getAll().posts[1].news);

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
                            });
                    }
                }
            },
            setEmptyNewsForPostWithNews: function () {
                return {
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        news: {}
                    },
                    expect: function (result) {
                        result.related('news').toJSON().should.eql({});

                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(0);
                            });
                    }
                }
            },
            setEmptyNewsForPostWithoutNews: function () {
                return {
                    id: 1,
                    options: {
                        withRelated: ['news']
                    },
                    values: {
                        news: {}
                    },
                    expect: function () {
                        return testUtils.database.getConnection()('news')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].news.id);
                                result[0].post_id.should.eql(2);
                                result[0].keywords.should.eql(testUtils.fixtures.getAll().posts[1].news.keywords);
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