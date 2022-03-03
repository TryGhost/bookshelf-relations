const testUtils = require('../utils');

describe('[Integration] HasMany: Posts/CustomFields+Events', function () {
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
                options: {withRelated: ['custom_fields', 'events']},
                expectSuccess: (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('custom_fields').length.should.eql(0);
                    posts.models[1].related('custom_fields').length.should.eql(2);
                    posts.models[2].related('events').length.should.eql(2);
                }
            });
        });
    });

    describe('destroy', function () {
        it('existingPostWithFields', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 2,
                expectSuccess: (result) => {
                    result.related('custom_fields').models.length.should.eql(0);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });

        it('existingPostWithoutFields', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 1,
                expectSuccess: (result) => {
                    result.related('custom_fields').models.length.should.eql(0);

                    return testUtils.database
                        .getConnection()('custom_fields').where('post_id', 1)
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });

        it('existingPostWithEvents', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 3,
                expectSuccess: () => {
                    // related events are not deleted
                    return testUtils.database
                        .getConnection()('events').where('post_id', 3)
                        .then((queryResult) => {
                            queryResult.length.should.eql(2);
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
                    withRelated: ['custom_fields']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('custom_fields').length.should.eql(2);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });

        it('editPostAndAddNewRelation', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me',
                    custom_fields: [
                        {
                            key: 'custom-image',
                            value: '/content/images/custom.jpg'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('custom_fields').length.should.eql(1);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(1);
                        });
                }
            });
        });

        it('addNewRelationsAndKeepExisting', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
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
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('custom_fields').length.should.eql(2);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });

        it('removeExistingRelations', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me',
                    custom_fields: []
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('custom_fields').length.should.eql(0);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(0);
                        });
                }
            });
        });

        it('editExistingRelations', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    custom_fields: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].custom_fields[0].id,
                            key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                            value: 'this-time-different'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('custom_fields').length.should.eql(1);
                    result.related('custom_fields').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                    result.related('custom_fields').models[0].get('key').should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                    result.related('custom_fields').models[0].get('value').should.eql('this-time-different');

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(1);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                            result[0].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                            result[0].value.should.eql('this-time-different');
                        });
                }
            });
        });

        it('duplicateKeyForExistingField', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    custom_fields: [
                        {
                            key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                            value: 'this-time-different'
                        }
                    ]
                },
                expectError: (result) => {
                    result.errorType.should.eql('BookshelfRelationsError');
                    result.statusCode.should.eql(500);
                    result.message.should.match(/nested/gi);
                    result.stack.should.match(/unique/gi);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(2);

                            result[0].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                            result[0].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                            result[0].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].value);

                            result[1].id.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].id);
                            result[1].key.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].key);
                            result[1].value.should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[1].value);
                        });
                }
            });
        });

        it('duplicateKeyPerMultiplePosts', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,
                values: {
                    custom_fields: [
                        {
                            key: testUtils.fixtures.getAll().posts[1].custom_fields[0].key,
                            value: 'this-time-different'
                        }
                    ]
                },
                expectSuccess: (outerResult) => {
                    outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    outerResult.related('custom_fields').length.should.eql(1);
                    outerResult.related('custom_fields').models[0].id.should.not.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].id);
                    outerResult.related('custom_fields').models[0].get('key').should.eql(testUtils.fixtures.getAll().posts[1].custom_fields[0].key);
                    outerResult.related('custom_fields').models[0].get('value').should.eql('this-time-different');

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
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
            });
        });

        it('setNull', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    custom_fields: null
                },
                options: {
                    withRelated: ['custom_fields']
                },
                expectSuccess: (outerResult) => {
                    outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    outerResult.related('custom_fields').length.should.eql(2);

                    return testUtils.database
                        .getConnection()('custom_fields')
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
                    custom_fields: undefined
                },
                options: {
                    withRelated: ['custom_fields']
                },
                expectSuccess: (outerResult) => {
                    outerResult.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    outerResult.related('custom_fields').length.should.eql(2);

                    return testUtils.database
                        .getConnection()('custom_fields')
                        .then((result) => {
                            result.length.should.eql(2);
                        });
                }
            });
        });
    });
});
