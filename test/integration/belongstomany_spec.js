const testUtils = require('../utils');

describe('[Integration] BelongsToMany: Posts/Tags', function () {
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
                options: {withRelated: ['tags']},
                expectSuccess: (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('tags').length.should.eql(0);
                    posts.models[1].related('tags').length.should.eql(2);
                }
            });
        });
    });

    describe('add', function () {
        it('postWithoutTags', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'}
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('postWithExistingTags', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('withTagForeignKey', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            tag_id: testUtils.fixtures.getAll().posts[1].tags[1].id
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });
        it('postWithNewAndExistingTags', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            slug: 'tada'
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });
        it('postsWithUnknownTagIds', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            id: 11111,
                            slug: 'lalalala'
                        }
                    ]
                },
                options: {
                    withRelated: ['tags']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(1);
                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });
        it('postWithNewTags', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            slug: 'tada'
                        },
                        {
                            slug: 'tada1'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', result.id)
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(4);
                                });
                        });
                }
            });
        });
    });

    describe('destroy', function () {
        it('existingPostWithTags', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 2,
                expectSuccess: (result) => {
                    result.related('tags').models.length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('existingPostWithoutTags', function () {
            return testUtils.testPostModel({
                method: 'destroy',
                id: 1,
                expectSuccess: (result) => {
                    result.related('tags').models.length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', 1)
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
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
                    withRelated: ['tags']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('tags').length.should.eql(2);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('deleteAllExistingTags', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: []
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('sendEmptyTag', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [{}]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('deleteAllExistingTagsFromPostWhichHasNone', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,
                values: {
                    tags: []
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    result.related('tags').length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags').where('post_id', 1)
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('deleteAllExistingTagsAndEditPost', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'new',
                    tags: []
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('new');
                    result.related('tags').length.should.eql(0);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(0);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('deleteLastExistingTag', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(1);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('addNewTagAndKeepExisting', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'case2',
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        },
                        {
                            slug: 'case2'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('case2');
                    result.related('tags').length.should.eql(2);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                    result.related('tags').models[1].get('slug').should.eql('case2');

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });

        it('addUnknownTargetId', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'case2',
                    tags: [
                        {
                            id: 20,
                            slug: 'unknown-id'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('case2');
                    result.related('tags').length.should.eql(1);

                    result.related('tags').models[0].id.should.not.eql(20);
                    result.related('tags').models[0].get('slug').should.eql('unknown-id');

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });

        it('useWithRelated', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        }
                    ]
                },
                options: {
                    withRelated: ['tags']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(1);
                }
            });
        });

        it('editExistingTag', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: 'edited'
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(1);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql('edited');

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('matchingUnknown', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            slug: 'test',
                            name: undefined
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(1);
                    result.related('tags').models[0].get('slug').should.eql('test');

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });

        it('noChanges', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(2);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                    result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                    result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('noChangesButUnknownAttr', function () {
            // NOTE: This is not the task of the plugin. Your project has to do field validation before saving.
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug,
                            parent: null
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(2);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                    result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                    result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('addDuplicates', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        },
                        {
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.related('tags').length.should.eql(1);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('addDuplicate', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        }
                    ]
                },
                expectSuccess: (result) => {
                    result.related('tags').length.should.eql(1);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(1);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('ensureOrder', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            slug: 'something'
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                        }
                    ]
                },
                expectSuccess: () => {
                    return testUtils.database
                        .getConnection()('posts_tags').orderBy('sort_order', 'ASC')
                        .then((result) => {
                            result.length.should.eql(3);
                            result[0].sort_order.should.eql(0);
                            result[0].sort_order.should.eql(0);

                            result[1].sort_order.should.eql(1);
                            result[1].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);

                            result[2].sort_order.should.eql(2);
                            result[2].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(3);
                                });
                        });
                }
            });
        });

        it('ensureOrderWithDeleteAndAddOperations', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: [
                        {
                            slug: 'something'
                        },
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                        },
                        {
                            slug: 'else'
                        }
                    ]
                },
                expectSuccess: (outerResult) => {
                    outerResult.related('tags').models.length.should.eql(3);

                    outerResult.related('tags').models[0].id.should.eql(3);
                    outerResult.related('tags').models[0].get('slug').should.eql('something');

                    outerResult.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                    outerResult.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                    outerResult.related('tags').models[2].get('slug').should.eql('else');
                    outerResult.related('tags').models[2].id.should.eql(4);

                    return testUtils.database
                        .getConnection()('posts_tags').orderBy('sort_order', 'ASC')
                        .then((result) => {
                            result.length.should.eql(3);

                            result[0].sort_order.should.eql(0);
                            result[0].tag_id.should.eql(outerResult.related('tags').models[0].id);

                            result[1].sort_order.should.eql(1);
                            result[1].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);

                            result[2].sort_order.should.eql(2);
                            result[2].tag_id.should.eql(outerResult.related('tags').models[2].id);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(4);
                                });
                        });
                }
            });
        });

        it('setNull', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'new title',
                    tags: null
                },
                options: {
                    withRelated: ['tags']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql('new title');
                    result.related('tags').length.should.eql(2);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                    result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                    result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('setUndefined', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    tags: undefined
                },
                options: {
                    withRelated: ['tags']
                },
                expectSuccess: (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(2);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                    result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                    result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                    return testUtils.database
                        .getConnection()('posts_tags')
                        .then((result) => {
                            result.length.should.eql(2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });
    });
});
