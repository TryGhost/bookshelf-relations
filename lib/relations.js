const Promise = require('bluebird');
const _ = require('lodash');
const Detector = require('./detector');
const debug = require('ghost-ignition').debug('relations');
const errors = require('../errors');

/**
 * @TODO:
 * - add `forUpdate` lock
 * - add nullable belongsTo FK example
 **/
class Relations {
    constructor(bookshelf) {
        this.bookshelf = bookshelf;
        this.detector = new Detector(this.bookshelf);
    }

    updateRelations(data, options) {
        let model = data.model;
        let relations = data.relations;
        let pluginOptions = data.pluginOptions || {};
        let opts = _.cloneDeep(options || {});
        let promises = [];

        Object.keys(relations).forEach((key) => {
            let value = relations[key];
            let relation = (model[key] instanceof Function && (typeof value === 'object' || Array.isArray(value))) ? model[key](model) : null;
            let type = relation ? relation.relatedData.type : null;
            let method = 'set' + type.charAt(0).toUpperCase() + type.slice(1);
            let setter = this[method];

            if (!type) {
                throw new errors.BookshelfRelationsError({
                    message: 'No relation type.',
                    code: 'UNKNOWN_RELATION',
                    context: {
                        key: key
                    }
                });
            }

            promises.push(() => {
                debug(key, method);

                return setter.bind(this)({
                    model: model,
                    key: key,
                    value: value,
                    relation: relation,
                    pluginOptions: pluginOptions
                }, opts).catch((err) => {
                    if (errors.utils.isIgnitionError(err) || (_.isArray(err) && errors.utils.isIgnitionError(err[0]))) {
                        throw err;
                    }

                    throw new errors.BookshelfRelationsError({
                        message: 'Unable to update nested relation.',
                        code: 'UPDATE_RELATION',
                        err: err,
                        context: {
                            key: key,
                            tableName: model.tableName,
                            method: method
                        }
                    });
                });
            });
        });

        return Promise.each(promises, (promise) => {
            return promise();
        });
    }

    setBelongsTo(data, options) {
        debug('setBelongsTo:start');

        let model = data.model;
        let key = data.key;
        let properties = data.value;
        let relation = data.relation;
        let opts = _.cloneDeep(options);
        let Target = relation.relatedData.target;
        let fk = relation.relatedData.foreignKey;
        const pluginOptions = data.pluginOptions;

        if (!fk) {
            throw new errors.BookshelfRelationsError({
                message: 'Foreign Key not found.',
                code: 'UNKNOWN_RELATION',
                help: 'this.hasOne(Target, foreignKey)',
                context: {
                    key: key,
                    tableName: model.tableName
                }
            });
        }

        let targetData = {
            model: model,
            Target: Target,
            fk: {key: 'id', value: model.get(fk)},
            properties: properties,
            key: key,
            saveValue: null,
            pluginOptions: pluginOptions
        };

        if (opts.method === 'insert') {
            return this.detector.saveTarget(targetData, opts)
                .then(function (result) {
                    model.set(fk, result.id);
                    model.relations[key] = result;

                    debug('setBelongsTo:end');
                    return model;
                });
        } else {
            return this.detector.saveTarget(targetData, opts)
                .then((result) => {
                    if (model.get(fk) === result.id) {
                        return result;
                    }

                    let toSave = model.constructor.forge({id: model.id});
                    opts.method = 'update';
                    toSave.set(fk, result.id);
                    return toSave.save(null, opts)
                        .then(() => {
                            return result;
                        });
                })
                .then((result) => {
                    model.relations[key] = result;

                    debug('setBelongsTo:end');
                    return model;
                });
        }
    }

    setHasOne(data, options) {
        debug('setHasOne:start');

        let model = data.model;
        let key = data.key;
        let properties = data.value;
        let relation = data.relation;
        let Target = relation.relatedData.target;
        let fk = relation.relatedData.foreignKey;
        let opts = _.cloneDeep(options);
        const pluginOptions = data.pluginOptions;

        if (!fk) {
            throw new errors.BookshelfRelationsError({
                message: 'Foreign Key not found.',
                code: 'UNKNOWN_RELATION',
                help: 'this.hasOne(Target, foreignKey)',
                context: {
                    key: key,
                    tableName: model.tableName
                }
            });
        }

        let targetData = {
            Target: Target,
            fk: {key: fk, value: model.id},
            properties: properties,
            saveValue: {[fk]: model.id},
            key: key,
            model: model,
            pluginOptions: pluginOptions
        };

        return this.detector.saveTarget(targetData, opts)
            .then((result) => {
                model.relations[key] = result;

                debug('setHasOne:end');
                return model;
            });
    }

    setBelongsToMany(data, options) {
        debug('setBelongsToMany:start');

        let model = data.model;
        let key = data.key;
        let newTargets = data.value;
        let pluginOptions = data.pluginOptions;
        let opts = _.cloneDeep(options);
        let existingTargets;
        let targetsToReturn;

        return this.detector.getExistingTargets({model: model, key: key, pluginOptions: pluginOptions}, opts)
            .then((_existingTargets) => {
                existingTargets = _existingTargets;

                // CASE: delete all targets (send []), no need to check if targets need to be inserted/updated
                if (!newTargets.length) {
                    return this.bookshelf.Collection.forge([]);
                }

                return this.detector.saveTargets({
                    key: key,
                    existingTargets: existingTargets,
                    newTargets: newTargets,
                    pluginOptions: pluginOptions
                }, opts);
            })
            .then((targets) => {
                targetsToReturn = targets;

                // Enforce attach/detach IDs
                existingTargets.relatedData.parentId = model.id;
                existingTargets.relatedData.parentFk = model.id;

                let targetsToAttach = [],
                    targetsToDetach = [];

                _.each(targets.models, (target) => {
                    if (!existingTargets.findWhere({id: target.id})) {
                        targetsToAttach.push(target);
                    }
                });

                return Promise.resolve()
                    .then(function () {
                        if (!targetsToAttach.length) {
                            return;
                        }

                        // NOTE: listen on created target models and be able to hook into the process
                        existingTargets.on('creating', (collection, data) => {
                            if (_.has(pluginOptions, 'hooks.belongsToMany.beforeRelationCreation')) {
                                return pluginOptions.hooks.belongsToMany.beforeRelationCreation(collection, data, opts);
                            }
                        });

                        return existingTargets.attach(targetsToAttach, _.pick(opts, ['transacting']))
                            .then(function () {
                                existingTargets.off('creating');
                            });
                    })
                    .then(() => {
                        _.each(existingTargets.models, (target) => {
                            if (!targets.findWhere({id: target.id})) {
                                targetsToDetach.push(target);
                            }
                        });

                        if (!targetsToDetach.length) {
                            return;
                        }

                        // NOTE: avoid InnoDB deadlock by detaching model by model (e.g. https://www.percona.com/blog/2012/03/27/innodbs-gap-locks/)
                        return Promise.each(targetsToDetach, (targetToDetach) => {
                            return existingTargets.detach(targetToDetach, _.pick(opts, ['transacting']));
                        });
                    }).then(() => {
                        if (_.has(pluginOptions, 'hooks.belongsToMany.after')) {
                            return pluginOptions.hooks.belongsToMany.after(existingTargets, targets, opts);
                        }
                    });
            })
            .then(() => {
                model.relations[key] = targetsToReturn;

                debug('setBelongsToMany:end');
                return model;
            });
    }

    setHasMany(data, options) {
        debug('setHasMany:start');

        let model = data.model;
        let key = data.key;
        let newTargets = data.value;
        let relation = data.relation;
        let opts = _.cloneDeep(options);
        const pluginOptions = data.pluginOptions;
        let fk = relation.relatedData.foreignKey;
        let existingTargets;
        let targets;

        if (!fk) {
            throw new errors.BookshelfRelationsError({
                message: 'Foreign Key not found.',
                code: 'UNKNOWN_RELATION',
                help: 'this.hasMany(Target, foreignKey)',
                context: {
                    key: key,
                    tableName: model.tableName
                }
            });
        }

        newTargets = newTargets.map((newTarget) => {
            if (!newTarget[fk]) {
                newTarget[fk] = model.id;
            }

            return newTarget;
        });

        return this.detector.getExistingTargets({model: model, key: key}, opts)
            .then((_existingTargets) => {
                existingTargets = _existingTargets;

                return this.detector.saveTargets({
                    key: key,
                    existingTargets: _existingTargets,
                    newTargets: newTargets,
                    pluginOptions: pluginOptions
                }, options);
            })
            .then((_targets) => {
                targets = _targets;

                targets.forEach((target) => {
                    existingTargets.add(target);
                });

                return existingTargets.mapThen((target) => {
                    if (!targets.findWhere({id: target.id})) {
                        return target.destroy(options);
                    }
                });
            })
            .then(() => {
                model.relations[key] = targets;

                debug('setHasMany:end');
                return model;
            });
    }
}

module.exports = Relations;
