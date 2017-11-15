'use strict';

const _ = require('lodash');
const models = require('../_database/models');
const testUtils = require('../utils');

describe('[Integration] HasMany: Posts/CustomFields', function () {
    beforeEach(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            });
    });

    describe('fetch', function () {
        it('existing', function () {
            return models.Post.fetchAll({withRelated: ['custom_fields']})
                .then(function (posts) {
                    posts.length.should.eql(2);
                    posts.models[0].related('custom_fields').length.should.eql(0);
                    posts.models[1].related('custom_fields').length.should.eql(2);
                });
        });
    });

    describe('destroy', function () {
        const destroyCases = {
            existingPostWithFields: function () {
                return {
                    expect: function (result) {
                        result.related('custom_fields').models.length.should.eql(0);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(0);
                            });
                    }
                }
            },
            existingPostWithoutFields: function () {
                return {
                    id: 1,
                    expect: function () {
                        return testUtils.database.getConnection()('custom_fields').where('post_id', 1)
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
            editPostOnly: function () {
                return {
                    options: {
                        withRelated: ['custom_fields']
                    },
                    values: {
                        title: 'only-me'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('custom_fields').length.should.eql(2);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            editPostAndAddNewRelation: function () {
                return {
                    values: {
                        title: 'only-me',
                        custom_fields: [
                            {
                                key: 'custom-image',
                                value: '/content/images/custom.jpg'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('custom_fields').length.should.eql(1);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(1);
                            });
                    }
                }
            },
            addNewRelationsAndKeepExisting: function () {
                return {
                    values: {
                        title: 'only-me',
                        custom_fields: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].custom_fields[0].id,
                                key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                                value: testUtils.fixtures.getAll().posts[1].custom_fields[0].value
                            },
                            {
                                key: 'custom-image',
                                value: '/content/images/custom.jpg'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('custom_fields').length.should.eql(2);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            removeExistingRelations: function () {
                return {
                    values: {
                        title: 'only-me',
                        custom_fields: []
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('custom_fields').length.should.eql(0);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(0);
                            });
                    }
                }
            },
            editExistingRelations: function () {
                return {
                    values: {
                        custom_fields: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].custom_fields[0].id,
                                key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                                value: 'this-time-different'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('custom_fields').length.should.eql(1);
                        result.related('custom_fields').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                        result.related('custom_fields').models[0].get('key').should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                        result.related('custom_fields').models[0].get('value').should.eql('this-time-different');

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(1);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                                result[0].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                                result[0].value.should.eql('this-time-different');
                            });
                    }
                }
            },
            duplicateKeyForExistingField: function () {
                return {
                    values: {
                        custom_fields: [
                            {
                                key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                                value: 'this-time-different'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.message.should.match(/unique/gi);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(2);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                                result[0].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                                result[0].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].value);

                                result[1].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].id);
                                result[1].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].key);
                                result[1].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].value);
                            });
                    }
                }
            },
            duplicateKeyPerMultiplePosts: function () {
                return {
                    id: 1,
                    values: {
                        custom_fields: [
                            {
                                key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                                value: 'this-time-different'
                            }
                        ]
                    },
                    expect: function (outerResult) {
                        outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                        outerResult.related('custom_fields').length.should.eql(1);
                        outerResult.related('custom_fields').models[0].id.should.not.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                        outerResult.related('custom_fields').models[0].get('key').should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                        outerResult.related('custom_fields').models[0].get('value').should.eql('this-time-different');


                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(3);

                                result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                                result[0].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                                result[0].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].value);

                                result[1].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].id);
                                result[1].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].key);
                                result[1].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].value);

                                result[2].id.should.eql(outerResult.related('custom_fields').models[0].id);
                                result[2].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                                result[2].value.should.eql('this-time-different');
                            });
                    }
                }
            },
            setNull: function () {
                return {
                    options: {
                        withRelated: ['custom_fields']
                    },
                    values: {
                        custom_fields: null
                    },
                    expect: function (outerResult) {
                        outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        outerResult.related('custom_fields').length.should.eql(2);

                        return testUtils.database.getConnection()('custom_fields')
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            setUndefined: function () {
                return {
                    options: {
                        withRelated: ['custom_fields']
                    },
                    values: {
                        custom_fields: undefined
                    },
                    expect: function (outerResult) {
                        outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        outerResult.related('custom_fields').length.should.eql(2);

                        return testUtils.database.getConnection()('custom_fields')
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