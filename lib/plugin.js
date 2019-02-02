const _ = require('lodash');
const Promise = require('bluebird');
const Relations = require('./relations');
const errors = require('../errors');

module.exports = function relationsPlugin(bookshelf, pluginOptions) {
    if (!bookshelf.manager) {
        bookshelf.manager = new Relations(bookshelf);
    }

    let pluginOpts = _.merge({
        unsetRelations: true,
        autoHook: true
    }, pluginOptions);

    const ParentModel = bookshelf.Model;

    if (!pluginOpts.autoHook) {
        return;
    }

    const unsetRelationships = (model, attrs) => {
        model.relationships.forEach((key) => {
            if (model.hasChanged(key)) {
                if (pluginOpts.unsetRelations) {
                    // NOTE: we can't unset the relation, otherwise it won't be detected as changed attribute
                    // this.changed() would not return the relationships
                    model.attributes = model.omit(key);
                }
            }

            if (attrs && attrs.hasOwnProperty(key)) {
                delete attrs[key];
            }
        });
    };

    const getRelations = (model, attrs, options = {}) => {
        let relations = {};

        model.relationships.forEach((key) => {
            if (model.hasChanged(key) || (attrs && attrs[key]) || options.method === 'destroy') {
                const value = model.related(key);
                const relation = (model[key] instanceof Function && (typeof value === 'object' || Array.isArray(value))) ? model[key](model) : null;
                const type = relation ? relation.relatedData.type : null;

                if (!type) {
                    throw new errors.BookshelfRelationsError({
                        message: 'No relation found.',
                        code: 'UNKNOWN_RELATION',
                        context: {
                            key: key,
                            tableName: model.tableName
                        }
                    });
                }

                if (!relations[type]) {
                    relations[type] = {};
                }

                if (options.method === 'destroy') {
                    if (['belongsToMany', 'hasMany'].indexOf(type) !== -1) {
                        relations[type][key] = [];
                    } else {
                        relations[type][key] = {};
                    }
                } else {
                    if (attrs.hasOwnProperty(key)) {
                        relations[type][key] = attrs[key];
                    } else {
                        relations[type][key] = model.get(key);
                    }
                }
            }
        });

        return relations;
    };

    let Model = bookshelf.Model.extend({
        save: function save(key, val, options) {
            let attrs;

            if (key === null || typeof key === 'object') {
                attrs = key || {};
                options = _.clone(val) || {};
            } else {
                attrs = {
                    [key]: val
                };

                options = options ? _.clone(options) : {};
            }

            const method = this.saveMethod(options);
            const ops = [];
            const args = arguments;
            const model = this;
            let saveResponse;

            options.method = method;

            if (method === 'insert') {
                // CASE: model does not use bookshelf-relations
                if (!model.relationships) {
                    return ParentModel.prototype.save.apply(model, args);
                }

                const relations = getRelations(model, attrs);
                unsetRelationships(model);

                // CASE: e.g. incorrect configuration
                if (!Object.keys(relations).length) {
                    return ParentModel.prototype.save.apply(model, args);
                }

                // @NOTE: "belongsTo" must be inserted **before** the target resource, because...
                if (relations.hasOwnProperty('belongsTo')) {
                    ops.push(function insertBelongsTo() {
                        const belongsTo = relations.belongsTo;
                        delete relations.belongsTo;

                        return bookshelf.manager.updateRelations({
                            model: model,
                            relations: belongsTo,
                            pluginOptions: pluginOpts
                        }, options);
                    });
                }

                ops.push(function insertResource() {
                    return ParentModel.prototype.save.apply(model, args)
                        .then((resp) => {
                            saveResponse = resp;
                            return resp;
                        });
                });

                if (Object.keys(relations).length) {
                    ops.push(function insertRelations() {
                        return Promise.each(Object.keys(relations), (key) => {
                            return bookshelf.manager.updateRelations({
                                model: saveResponse,
                                relations: relations[key],
                                pluginOptions: pluginOpts
                            }, options);
                        });
                    });
                }

                return Promise.reduce(ops, (results, task) => {
                    return task().then((response) => {
                        results.push(response);
                        return results;
                    });
                }, []).then(() => {
                    return saveResponse;
                });
            } else if (method === 'update') {
                // CASE: model does not use bookshelf-relations
                if (!model.relationships) {
                    return ParentModel.prototype.save.apply(model, args);
                }

                const relations = getRelations(model, attrs);
                unsetRelationships(model, attrs);

                // CASE: e.g. incorrect configuration
                if (!Object.keys(relations).length) {
                    return ParentModel.prototype.save.apply(model, args);
                }

                ops.push(function updateResource() {
                    return ParentModel.prototype.save.apply(model, args)
                        .then((resp) => {
                            saveResponse = resp;
                            return resp;
                        });
                });

                ops.push(function updateRelations() {
                    return Promise.each(Object.keys(relations), (key) => {
                        return bookshelf.manager.updateRelations({
                            model: saveResponse,
                            relations: relations[key],
                            pluginOptions: pluginOpts
                        }, options);
                    });
                });

                return Promise.reduce(ops, (results, task) => {
                    return task().then((response) => {
                        results.push(response);
                        return results;
                    });
                }, []).then(() => {
                    return saveResponse;
                });
            } else {
                return ParentModel.prototype.save.apply(model, args);
            }
        },

        destroy: function destroy(options) {
            const ops = [];
            const args = arguments;
            const model = this;
            let saveResponse;

            // CASE: model does not use bookshelf-relations
            if (!model.relationships) {
                return ParentModel.prototype.destroy.apply(model, args);
            }

            const relations = getRelations(model, null, {method: 'destroy'});
            unsetRelationships(model);

            // CASE: e.g. incorrect configuration
            if (!Object.keys(relations).length) {
                return ParentModel.prototype.destroy.apply(model, args);
            }

            // @NOTE: must happen before the target resource get's destroyed
            ops.push(function destroyRelations() {
                return Promise.each(Object.keys(relations), (key) => {
                    return bookshelf.manager.updateRelations({
                        model: model,
                        relations: relations[key],
                        pluginOptions: pluginOpts
                    }, options);
                });
            });

            ops.push(function deleteResource() {
                return ParentModel.prototype.destroy.apply(model, args)
                    .then((resp) => {
                        saveResponse = resp;
                        return resp;
                    });
            });

            return Promise.reduce(ops, (results, task) => {
                return task().then((response) => {
                    results.push(response);
                    return results;
                });
            }, []).then(() => {
                return saveResponse;
            });
        }
    });

    bookshelf.Model = Model;
};
