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
        it('creates a post without tags', function () {
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

        it('attaches existing tag to a newly created post', async function () {
            const currentTags = await testUtils.database.getConnection()('tags');
            currentTags.length.should.eql(2);
            should.equal(currentTags[0].slug, 'slug1');
            should.equal(currentTags[1].slug, 'slug2');

            await testUtils.testPostModel({
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
                expectSuccess: async (result) => {
                    result.get('title').should.eql('test-post-no-tags');

                    const postTags = await testUtils.database
                        .getConnection()('posts_tags')
                        .where('post_id', result.id);
                    postTags.length.should.eql(1);

                    const tags = await testUtils.database.getConnection()('tags');
                    tags.length.should.eql(2);
                    should.equal(tags[0].slug, 'slug1');
                    should.equal(tags[1].slug, 'slug2');
                }
            });
        });

        it('throws ValidationErrors when slug property value is set to an invalid one', function () {
            return testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'test-post-no-tags',
                    author: {name: 'Tomas'},
                    tags: [
                        {
                            id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                            slug: ''
                        }
                    ]
                },
                expectError: (err) => {
                    err.message.should.match(/slug/gi);
                    err.errorType.should.eql('ValidationError');
                    err.statusCode.should.eql(422);
                }
            });
        });

        it('attaches a tag to a posts using foreign key syntax', function () {
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

        it('attaches a mix of newly created and existing tags to a post', function () {
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

        it('creates a new tag when the id is not matching any existing tags', function () {
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

        it('creates two new tags', function () {
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
        it('does not remove related tags when the post with tags is removed', function () {
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

        it('does not remove any tags when the post without tags is removed', function () {
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
        it('only edits the post', function () {
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

        it('detaches all existing tags when empty array syntax is used', function () {
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

        it('detaches all existing tags when empty object syntax is used', function () {
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

        it('does not remove any tags when none have been assigned to the post when using empty array syntax', function () {
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

        it('does not remove any tags when none have been assigned to the post when using empty array syntax while editing the post', function () {
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

        it('removes an exiting tag from the post when not present in the relation', async function () {
            const postTags = await testUtils.database.getConnection()('posts_tags').where('post_id', 2);
            should.equal(postTags.length, 2);

            await testUtils.testPostModel({
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
                        .where('post_id', 2)
                        .then((result) => {
                            result.length.should.eql(1);
                            should.equal(result[0].id, 2);

                            return testUtils.database
                                .getConnection()('tags')
                                .then((result) => {
                                    result.length.should.eql(2);
                                });
                        });
                }
            });
        });

        it('adds a new tag while keeping an existing one', function () {
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

        it('edits existing tag property', async function () {
            await testUtils.testPostModel({
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
                expectSuccess: async (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('tags').length.should.eql(1);

                    result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql('edited');

                    const postTags = await testUtils.database.getConnection()('posts_tags');

                    postTags.length.should.eql(1);

                    const tags = await testUtils.database.getConnection()('tags');

                    tags.length.should.eql(2);
                }
            });
        });

        it('edits ONLY "editable" tag properties but NOT the "read-only" labels', async function () {
            const post = testUtils.fixtures.getAll().posts[1];
            await testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    tags: [
                        {
                            id: post.tags[0].id,
                            slug: 'edited'
                        }
                    ],
                    tiers: [
                        {
                            id: post.tiers[0].id,
                            name: 'Pesky edit shall not pass'
                        }
                    ]
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql(post.title);

                    result.related('tags').length.should.eql(1);
                    result.related('tags').models[0].id.should.eql(post.tags[0].id);
                    result.related('tags').models[0].get('slug').should.eql('edited');

                    result.related('tiers').length.should.eql(1);
                    result.related('tiers').models[0].id.should.eql(post.tiers[0].id);
                    result.related('tiers').models[0].get('name').should.eql(post.tiers[0].name);

                    const postTags = await testUtils.database.getConnection()('posts_tags');
                    postTags.length.should.eql(1);

                    const tags = await testUtils.database.getConnection()('tags');
                    tags.length.should.eql(2);

                    const postTiers = await testUtils.database.getConnection()('posts_tiers');
                    postTiers.length.should.eql(2);

                    const tiers = await testUtils.database.getConnection()('tiers');
                    tiers.length.should.eql(1);
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
