'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Detector = require('./detector');

/**
 * @TODO:
 * - add coverage
 * - proper error handling
 * - require transactions (!)
 * - add `forUpdate` lock
 * - child models need to call initialize of the parent, otherwise you cant listen on model events in the model and in the plugin
 * - add note that nested-nested relations are not support e.g. posts.tags = [{ news: {} }]
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
            let type = relation ? relation.relatedData.type : 'scalar';
            let method = 'set' + type.charAt(0).toUpperCase() + type.slice(1);
            let setter = this[method];

            // e.g. update of single fields of a model
            if (type === 'scalar') {
                return;
            }

            // setting a relationship null e.g. post.tags = null does not mean we detach all models!
            if (value === null || value === undefined) {
                return;
            }

            promises.push(() => {
                return setter.bind(this)({
                    model: model,
                    key: key,
                    value: value,
                    relation: relation,
                    pluginOptions: pluginOptions
                }, opts);
            });
        });

        return Promise.each(promises, (promise) => {
            return promise();
        });
    }

    setBelongsTo(data, options) {
        let model = data.model;
        let key = data.key;
        let properties = data.value;
        let relation = data.relation;
        let opts = _.cloneDeep(options);
        let Target = relation.relatedData.target;
        let fk = relation.relatedData.foreignKey;

        let targetData = {
            model: model,
            target: Target.forge(_.pick(properties, 'id')),
            fk: {key: 'id', value: model.get(fk)},
            properties: properties,
            key: key,
            saveValue: null
        };

        if (opts.method === 'insert') {
            return this.detector.saveTarget(targetData, opts)
                .then(function (result) {
                    model.set(fk, result.id);
                    model.relations[key] = result;
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
                    return model;
                });
        }
    }

    setHasOne(data, options) {
        let model = data.model;
        let key = data.key;
        let properties = data.value;
        let relation = data.relation;
        let Target = relation.relatedData.target;
        let fk = relation.relatedData.foreignKey;
        let opts = _.cloneDeep(options);

        let targetData = {
            target: Target.forge(_.pick(properties, 'id')),
            fk: {key: fk, value: model.id},
            properties: properties,
            saveValue: {[fk]: model.id},
            key: key,
            model: model
        };

        return this.detector.saveTarget(targetData, opts)
            .then((result) => {
                model.relations[key] = result;
                return model;
            });
    }

    setBelongsToMany(data, options) {
        let model = data.model;
        let key = data.key;
        let newTargets = data.value;
        let pluginOptions = data.pluginOptions;
        let opts = _.cloneDeep(options);
        let existingTargets;

        return this.detector.getExistingTargets({
            model: model,
            key: key
        }, opts).then((_existingTargets) => {
            existingTargets = _existingTargets;

            return this.detector.saveTargets({
                existingTargets: existingTargets,
                newTargets: newTargets
            }, opts);
        }).then((targets) => {
            // Enforce attach/detach IDs
            existingTargets.relatedData.parentId = model.id;
            existingTargets.relatedData.parentFk = model.id;

            return Promise.each(targets.models, (target) => {
                if (!existingTargets.findWhere({id: target.id})) {
                    existingTargets.on('creating', (collection, data) => {
                        if (pluginOptions && pluginOptions.belongsToMany && pluginOptions.belongsToMany.beforeRelationCreation) {
                            return pluginOptions.belongsToMany.beforeRelationCreation(collection, data, opts);
                        }
                    });

                    return existingTargets.attach(target, {transacting: opts.transacting});
                }
            }).then(() => {
                return Promise.each(existingTargets.models, (target) => {
                    if (!targets.findWhere({id: target.id})) {
                        return existingTargets.detach(target, {transacting: opts.transacting});
                    }
                });
            }).then(() => {
                if (pluginOptions && pluginOptions.belongsToMany && pluginOptions.belongsToMany.after) {
                    return pluginOptions.belongsToMany.after(existingTargets, targets, opts);
                }
            });
        }).then(() => {
            return model;
        });
    }

    setHasMany(data, options) {
        let model = data.model;
        let key = data.key;
        let newTargets = data.value;
        let relation = data.relation;
        let opts = _.cloneDeep(options);
        let fk = relation.relatedData.foreignKey;
        let existingTargets;
        let targets;

        if (!fk) {
            throw new Error('`' + model.tableName + '#' + key + '` relation is missing `foreignKey` in `this.hasMany(Target, foreignKey)`');
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
                    existingTargets: _existingTargets,
                    newTargets: newTargets
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
                return model;
            })
            .catch((err) => {
                // @TODO: custom error!!!!
                throw err;
            });
    }
}

module.exports = Relations;

