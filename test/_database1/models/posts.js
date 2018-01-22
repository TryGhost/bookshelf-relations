'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const ObjectId = require('bson-objectid');
require('should');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    bookshelf.plugin(require('../../../lib/plugin'), {
        hooks: {
            belongsToMany: {
                after: function (existing, targets, options) {
                    if (targets && targets.models.length && targets.models[0].tableName === 'tags') {
                        return Promise.each(targets.models, function (target, index) {
                            return existing.updatePivot({
                                sort_order: index
                            }, _.extend({}, options, {query: {where: {tag_id: target.id}}}))
                                .catch(function (err) {
                                    // @TODO: it tries to update the pivot for tags_nested, but it has no pivot
                                    if (err.code === 'ER_BAD_FIELD_ERROR') {
                                        return Promise.resolve();
                                    }

                                    throw err;
                                })
                        });
                    } else if (targets && targets.models.length && targets.models[0].tableName === 'authors') {
                        return Promise.each(targets.models, function (target, index) {
                            return existing.updatePivot({
                                sort_order: index
                            }, _.extend({}, options, {query: {where: {author_id: target.id}}}));
                        });
                    } else {
                        return Promise.resolve();
                    }
                },
                beforeRelationCreation: function onCreatingRelation(model, data) {
                    data.id = ObjectId.generate();
                }
            }
        }
    });

    let Post = bookshelf.Model.extend({
        tableName: 'posts',

        relationships: ['tags', 'authors', 'meta', 'revisions'],

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });

            this.on('saved', function (model, attrs, options) {
                if (options.method === 'insert') {
                    return;
                }

                // @TODO: dirty
                // @TODO: ensure we keep the old revisions
                model.onPluginDone = function (model, deleted) {
                    if (deleted.indexOf('revisions') !== -1) {
                        return;
                    }

                    // add option to plugin to change behaviour of passing [...] (keep existing!!!!)
                    model.set('revisions', [{
                        data: JSON.stringify(model.toJSON())
                    }]);

                    return model.save(null, options)
                };
            });

            bookshelf.Model.prototype.initialize.call(this);
        },

        tags: function () {
            return this.belongsToMany('Tag').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
        },

        authors: function () {
            return this.belongsToMany('Author', 'posts_authors').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
        },

        meta: function () {
            return this.hasMany('Meta', 'object_id');
        },

        revisions: function () {
            return this.belongsToMany('Revision', 'posts_revisions');
        }
    }, {
        add: function (data) {
            return bookshelf.transaction((transacting) => {
                let post = this.forge(data);
                return post.save(null, {transacting: transacting});
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

    return {
        Post: bookshelf.model('Post', Post)
    };
};