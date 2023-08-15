const testUtils = require('../utils');

const _ = require('lodash');
const Bookshelf = require('bookshelf');
const errors = require('@tryghost/errors');

function setupModel(knex, hookConfig) {
    const bookshelf = Bookshelf(knex);
    const result = {
        globalAfterHookCalled: false,
        globalBeforeHookCalled: false,
        modelAfterHookCalled: false,
        modelBeforeHookCalled: false
    };

    bookshelf.plugin(require('../../lib/plugin'), {
        editRelations: false,
        extendChanged: '_changed',
        hooks: {
            belongsToMany: {
                after: hookConfig.global.after ? function () {
                    result.globalAfterHookCalled = true;
                } : null,
                beforeRelationCreation: hookConfig.global.before ? function () {
                    result.globalBeforeHookCalled = true;
                } : null
            }
        }
    });

    let Tag = bookshelf.Model.extend({
        tableName: 'tags',
        requireFetch: false,

        initialize: function () {
            this.on('saving', function (model) {
                const allowedFields = ['id', 'slug'];

                _.each(model.toJSON(), (value, key) => {
                    if (allowedFields.indexOf(key) === -1) {
                        model.unset(key);
                    }
                });

                if (model.get('slug').length === 0) {
                    throw new errors.ValidationError({message: 'Slug should not be empty'});
                }
            });
        }
    });

    let Post = bookshelf.Model.extend({
        tableName: 'posts',

        hooks: {
            belongsToMany: {
                after: hookConfig.model.after ? function () {
                    result.modelAfterHookCalled = true;
                } : null,
                beforeRelationCreation: hookConfig.model.before ? function () {
                    result.modelBeforeHookCalled = true;
                } : null
            }
        },

        relationships: ['tags'],

        relationshipConfig: {
            tags: {
                editable: true
            }
        },

        initialize: function () {
            bookshelf.Model.prototype.initialize.call(this);

            this.on('updating', function (model) {
                model._changed = _.cloneDeep(model.changed);
            });
        },

        tags: function () {
            return this.belongsToMany('Tag', 'posts_tags', 'post_id', 'tag_id').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
        }
    }, {
        add: function (data, options) {
            options = options || {};

            return bookshelf.transaction((transacting) => {
                options.transacting = transacting;

                let post = this.forge(data);
                return post.save(null, options);
            });
        },

        edit: function (data, options) {
            return bookshelf.transaction((transacting) => {
                let post = this.forge(_.pick(data, 'id'));

                return post.fetch(_.merge({transacting: transacting}, options))
                    .then((dbPost) => {
                        if (!dbPost) {
                            throw new Error('Post does not exist');
                        }

                        return dbPost.save(_.omit(data, 'id'), _.merge({transacting: transacting}, options));
                    });
            });
        },

        destroy: function (data) {
            return bookshelf.transaction((transacting) => {
                return this.forge(_.pick(data, 'id'))
                    .destroy({transacting: transacting});
            });
        }
    });

    result.Tag = bookshelf.model('Tag', Tag);
    result.Post = bookshelf.model('Post', Post);
    return result;
}

describe('[Integration] Hooks: Posts/Tags', function () {
    let authorId;
    beforeEach(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            })
            .then(function () {
                const knex = testUtils.database.getConnection();
                return knex('authors').select('id').first().then((row) => {
                    authorId = row.id;
                });
            });
    });

    it('Uses the model hooks if all hooks present', function () {
        const result = setupModel(testUtils.database.getConnection(), {
            global: {
                before: true,
                after: true
            },
            model: {
                before: true,
                after: true
            }
        });

        return result.Post.add({
            author_id: authorId,
            tags: ['blah']
        }).then(() => {
            should.equal(result.globalAfterHookCalled, false);
            should.equal(result.globalBeforeHookCalled, false);
            should.equal(result.modelAfterHookCalled, true);
            should.equal(result.modelBeforeHookCalled, true);
        });
    });

    it('Uses the global hooks if no model hook there', function () {
        const result = setupModel(testUtils.database.getConnection(), {
            global: {
                before: true,
                after: true
            },
            model: {
                before: false,
                after: false
            }
        });

        return result.Post.add({
            author_id: authorId,
            tags: ['blah']
        }).then(() => {
            should.equal(result.globalAfterHookCalled, true);
            should.equal(result.globalBeforeHookCalled, true);
            should.equal(result.modelAfterHookCalled, false);
            should.equal(result.modelBeforeHookCalled, false);
        });
    });

    it('Uses the model hooks when available', function () {
        const result = setupModel(testUtils.database.getConnection(), {
            global: {
                before: true,
                after: true
            },
            model: {
                before: false,
                after: true
            }
        });

        return result.Post.add({
            author_id: authorId,
            tags: ['blah']
        }).then(() => {
            should.equal(result.globalAfterHookCalled, false);
            should.equal(result.globalBeforeHookCalled, true);
            should.equal(result.modelAfterHookCalled, true);
            should.equal(result.modelBeforeHookCalled, false);
        });
    });
});
