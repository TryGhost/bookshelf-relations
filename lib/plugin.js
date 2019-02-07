const _ = require('lodash');
const Promise = require('bluebird');
const Relations = require('./relations');
const errors = require('../errors');

module.exports = function relationsPlugin(bookshelf, pluginOptions) {
    let pluginOpts = _.merge({
        unsetRelations: true,
        autoHook: true
    }, pluginOptions);

    if (!bookshelf.manager) {
        bookshelf.manager = new Relations(bookshelf, pluginOpts);
    }

    const ParentModel = bookshelf.Model;

    if (!pluginOpts.autoHook) {
        return;
    }

    const remember = (model, relations) => {
        model._relations = relations;
    };

    const unset = (model) => {
        model.relationships.forEach((relation) => {
            model.unset(relation);
        });
    };

    const getRelations = (model, options = {}) => {
        let relations = {};

        model.relationships.forEach((key) => {
            if (model.get(key) || options.event === 'destroying') {
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

                if (options.event === 'destroying') {
                    if (['belongsToMany', 'hasMany'].indexOf(type) !== -1) {
                        relations[type][key] = [];
                    } else {
                        relations[type][key] = {};
                    }
                } else {
                    relations[type][key] = model.get(key);
                }
            }
        });

        return relations;
    };

    let Model = bookshelf.Model.extend({
        triggerThen: function triggerThen(event, model, attrs, options) {
            // CASE: deleted
            if (!options) {
                options = attrs;
            }

            const ops = [];
            let saveResponse;
            const self = this;

            // CASE: model does not use bookshelf-relations
            if (!model.relationships) {
                return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options);
            }

            if (!['saving creating', 'saving updating', 'destroying', 'created saved'].includes(event)) {
                return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options);
            }

            if (event === 'saving creating') {
                ops.push(function triggerThen() {
                    return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options)
                        .then((resp) => {
                            saveResponse = resp;
                            return resp;
                        });
                });

                ops.push(function updateRelations() {
                    const relations = getRelations(model, {event: event});

                    // CASE: e.g. incorrect configuration
                    if (!Object.keys(relations).length) {
                        return Promise.resolve();
                    }

                    remember(model, relations);

                    // @NOTE: we have to reset otherwise we will try to update relation fields on the resource, which do not exist
                    unset(model);

                    // @NOTE: "belongsTo" must be inserted **before** the target resource, because...
                    if (relations.belongsTo) {
                        return bookshelf.manager.updateRelations({
                            model: model,
                            relations: model._relations.belongsTo,
                            pluginOptions: pluginOpts
                        }, options).then((response) => {
                            delete model._relations.belongsTo;
                            return response;
                        });
                    }

                    return Promise.resolve();
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

            if (event === 'created saved') {
                ops.push(function updateRelations() {
                    // @NOTE: remembered!
                    const relations = model._relations;

                    // CASE: resource has no relations
                    if (!relations || Object.keys(relations).length === 0) {
                        return Promise.resolve();
                    }

                    // CASE: e.g. incorrect configuration
                    if (!Object.keys(relations).length) {
                        return Promise.resolve();
                    }

                    return Promise.each(Object.keys(relations), (key) => {
                        return bookshelf.manager.updateRelations({
                            model: model,
                            relations: relations[key],
                            pluginOptions: pluginOpts
                        }, options);
                    });
                });

                ops.push(function triggerThen() {
                    return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options)
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

            if (event === 'saving updating') {
                ops.push(function triggerThen() {
                    return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options)
                        .then((resp) => {
                            saveResponse = resp;
                            return resp;
                        });
                });

                ops.push(function updateRelations() {
                    const relations = getRelations(model, {event: event});

                    unset(model);

                    // CASE: e.g. incorrect configuration
                    if (!Object.keys(relations).length) {
                        return Promise.resolve();
                    }

                    return Promise.each(Object.keys(relations), (key) => {
                        return bookshelf.manager.updateRelations({
                            model: model,
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
            }

            if (event === 'destroying') {
                ops.push(function triggerThen() {
                    return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options)
                        .then((resp) => {
                            saveResponse = resp;
                            return resp;
                        });
                });

                // @NOTE: must happen before the target resource get's destroyed
                ops.push(function destroyRelations() {
                    const relations = getRelations(model, {event: event});

                    unset(model);

                    // CASE: e.g. incorrect configuration
                    if (!Object.keys(relations).length) {
                        return Promise.resolve();
                    }

                    return Promise.each(Object.keys(relations), (key) => {
                        return bookshelf.manager.updateRelations({
                            model: model,
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
            }

            return ParentModel.prototype.triggerThen.call(self, event, model, attrs, options);
        }
    });

    bookshelf.Model = Model;
};
