'use strict';

const _ = require('lodash');
const models = require('../_database/models');
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
            return models.Post.fetchAll({withRelated: ['tags']})
                .then(function (posts) {
                    posts.length.should.eql(2);
                    posts.models[0].related('tags').length.should.eql(0);
                    posts.models[1].related('tags').length.should.eql(2);
                });
        });
    });

    describe('add', function () {
        const addCases = {
            postWithoutTags: function () {
                return {
                    values: {
                        title: 'test-post-no-tags'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('test-post-no-tags');

                        return testUtils.database.getConnection()('posts_tags').where('post_id', result.id)
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            postWithExistingTags: function () {
                return {
                    values: {
                        title: 'test-post-no-tags',
                        tags: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                                slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql('test-post-no-tags');

                        return testUtils.database.getConnection()('posts_tags').where('post_id', result.id)
                            .then(function (result) {
                                result.length.should.eql(1);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            postWithNewAndExistingTags: function () {
                return {
                    values: {
                        title: 'test-post-no-tags',
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
                    expect: function (result) {
                        result.get('title').should.eql('test-post-no-tags');

                        return testUtils.database.getConnection()('posts_tags').where('post_id', result.id)
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(3);
                            });
                    }
                }
            },
            postWithNewTags: function () {
                return {
                    values: {
                        title: 'test-post-no-tags',
                        tags: [
                            {
                                slug: 'tada'
                            },
                            {
                                slug: 'tada1'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql('test-post-no-tags');

                        return testUtils.database.getConnection()('posts_tags').where('post_id', result.id)
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(4);
                            });
                    }
                }
            }
        };

        return _.each(Object.keys(addCases), function (key) {
            it(key, function () {
                let addCase = addCases[key]();

                return models.Post.add(_.merge({author: {name: 'Tomas'}}, addCase.values))
                    .then(function (result) {
                        return addCase.expect(result);
                    })
                    .catch(function (err) {
                        if (err instanceof should.AssertionError) {
                            throw err;
                        }

                        return addCase.expect(err);
                    });
            });
        });
    });

    describe('destroy', function () {
        const destroyCases = {
            existingPostWithTags: function () {
                return {
                    expect: function (result) {
                        result.related('tags').models.length.should.eql(0);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            existingPostWithoutTags: function () {
                return {
                    id: 1,
                    expect: function () {
                        return testUtils.database.getConnection()('posts_tags').where('post_id', 1)
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
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
                        withRelated: ['tags']
                    },
                    values: {
                        title: 'only-me'
                    },
                    expect: function (result) {
                        result.get('title').should.eql('only-me');
                        result.related('tags').length.should.eql(2);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            deleteAllExistingTags: function () {
                return {
                    values: {
                        tags: [],
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(0);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            deleteAllExistingTagsFromPostWhichHasNone: function () {
                return {
                    id: 1,
                    values: {
                        tags: []
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                        result.related('tags').length.should.eql(0);

                        return testUtils.database.getConnection()('posts_tags').where('post_id', 1)
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            deleteAllExistingTagsAndEditPost: function () {
                return {
                    values: {
                        title: 'new',
                        tags: []
                    },
                    expect: function (result) {
                        result.get('title').should.eql('new');
                        result.related('tags').length.should.eql(0);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(0);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            deleteLastExistingTag: function () {
                return {
                    values: {
                        tags: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].tags[1].id,
                                slug: testUtils.fixtures.getAll().posts[1].tags[1].slug
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(1);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(1);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            addNewTagAndKeepExisting: function () {
                return {
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
                    expect: function (result) {
                        result.get('title').should.eql('case2');
                        result.related('tags').length.should.eql(2);

                        result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                        result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                        result.related('tags').models[1].get('slug').should.eql('case2');

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(3);
                            });
                    }
                }
            },
            useWithRelated: function () {
                return {
                    options: {
                        withRelated: ['tags']
                    },
                    values: {
                        tags: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                                slug: testUtils.fixtures.getAll().posts[1].tags[0].slug
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(1);
                    }
                }
            },
            editExistingTag: function () {
                return {
                    values: {
                        tags: [
                            {
                                id: testUtils.fixtures.getAll().posts[1].tags[0].id,
                                slug: 'edited'
                            }
                        ]
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(1);

                        result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                        result.related('tags').models[0].get('slug').should.eql('edited');

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(1);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            noChanges: function () {
                return {
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
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(2);

                        result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                        result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                        result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                        result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            addDuplicates: function () {
                return {
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
                    expect: function (result) {
                        result.message.should.match(/unique/gi);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            ensureOrder: function () {
                return {
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
                    expect: function () {
                        return testUtils.database.getConnection()('posts_tags').orderBy('sort_order', 'ASC')
                            .then(function (result) {
                                result.length.should.eql(3);
                                result[0].sort_order.should.eql(0);
                                result[0].sort_order.should.eql(0);

                                result[1].sort_order.should.eql(1);
                                result[1].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);

                                result[2].sort_order.should.eql(2);
                                result[2].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(3);
                            });
                    }
                }
            },
            ensureOrderWithDeleteAndAddOperations: function () {
                return {
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
                    expect: function (outerResult) {
                        outerResult.related('tags').models.length.should.eql(3);

                        return testUtils.database.getConnection()('posts_tags').orderBy('sort_order', 'ASC')
                            .then(function (result) {
                                result.length.should.eql(3);

                                result[0].sort_order.should.eql(0);
                                result[0].tag_id.should.eql(outerResult.related('tags').models[1].id);
                                outerResult.related('tags').models[1].get('slug').should.eql('something');

                                result[1].sort_order.should.eql(1);
                                result[1].tag_id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);

                                result[2].sort_order.should.eql(2);
                                result[2].tag_id.should.eql(outerResult.related('tags').models[2].id);
                                outerResult.related('tags').models[2].get('slug').should.eql('else');
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(4);
                            });
                    }
                }
            },
            setNull: function () {
                return {
                    options: {
                        withRelated: ['tags']
                    },
                    values: {
                        title: 'new title',
                        tags: null
                    },
                    expect: function (result) {
                        result.get('title').should.eql('new title');
                        result.related('tags').length.should.eql(2);

                        result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                        result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                        result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                        result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
                            .then(function (result) {
                                result.length.should.eql(2);
                            });
                    }
                }
            },
            setUndefined: function () {
                return {
                    options: {
                        withRelated: ['tags']
                    },
                    values: {
                        tags: undefined
                    },
                    expect: function (result) {
                        result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                        result.related('tags').length.should.eql(2);

                        result.related('tags').models[0].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[0].id);
                        result.related('tags').models[0].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[0].slug);

                        result.related('tags').models[1].id.should.eql(testUtils.fixtures.getAll().posts[1].tags[1].id);
                        result.related('tags').models[1].get('slug').should.eql(testUtils.fixtures.getAll().posts[1].tags[1].slug);

                        return testUtils.database.getConnection()('posts_tags')
                            .then(function (result) {
                                result.length.should.eql(2);
                            })
                            .then(function () {
                                return testUtils.database.getConnection()('tags');
                            })
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