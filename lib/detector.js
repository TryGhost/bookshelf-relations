const Promise = require('bluebird');
const _ = require('lodash');
const errors = require('../errors');

class Detector {
    constructor(bookshelf) {
        this.bookshelf = bookshelf;
    }

    saveTarget(data, options) {
        let model = data.model;
        let key = data.key;
        const Target = data.Target;
        let properties = data.properties;
        let target = Target.forge(_.pick(properties, 'id'));
        let fk = data.fk;
        let saveValue = data.saveValue;
        const pluginOptions = data.pluginOptions;
        const allowedOptions = pluginOptions.allowedOptions || [];
        let existingRelation = model.related(key);
        let opts = _.cloneDeep(options);

        return new Promise((resolve, reject) => {
            if (!Object.keys(properties).length) {
                return resolve(target);
            }

            if (!target.id) {
                opts.method = 'insert';
                return resolve(target);
            }

            if (opts.hasOwnProperty('withRelated') &&
                opts.withRelated.indexOf(key) !== -1 &&
                existingRelation && existingRelation.id &&
                properties.id === existingRelation.id) {
                opts.method = 'update';
                return resolve(existingRelation);
            }

            target.fetch(_.pick(opts, ['transacting']))
                .then((result) => {
                    if (!result) {
                        let targetToInsert = Target.forge();
                        opts.method = 'insert';
                        return resolve(targetToInsert);
                    }

                    opts.method = 'update';
                    return resolve(result);
                })
                .catch(reject);
        }).then((result) => {
            if (!Object.keys(properties).length) {
                if (!fk.value) {
                    return result;
                }

                return result.where(fk.key, fk.value).destroy(_.pick(opts, ['transacting'].concat(allowedOptions)));
            }

            _.each(_.omit(properties, 'id'), (value, key) => {
                result.set(key, value);
            });

            // CASE: We found a matching target, but nothing has changed.
            if (result.id && !result.hasChanged()) {
                return result;
            }

            return result.save(saveValue, _.pick(opts, ['transacting', 'method'].concat(allowedOptions)))
                .then((result) => {
                    return result;
                });
        });
    }

    getExistingTargets(data, options) {
        let opts = _.cloneDeep(options);
        let model = data.model;
        let key = data.key;
        let existingRelations = model.related(key);
        const pluginOptions = data.pluginOptions || {};
        const allowedOptions = pluginOptions.allowedOptions || [];

        return new Promise((resolve, reject) => {
            if (opts.method === 'insert') {
                return resolve(existingRelations);
            }

            if (opts.hasOwnProperty('withRelated') && opts.withRelated.indexOf(key) !== -1) {
                return resolve(existingRelations);
            }

            return existingRelations.fetch(_.pick(opts, ['transacting', 'method'].concat(allowedOptions)))
                .then((existingRelations) => {
                    resolve(existingRelations);
                })
                .catch(reject);
        });
    }

    // @TODO: only search by unique columns
    getMatchingTarget(data, options) {
        let opts = _.cloneDeep(options);
        let originalProperties = _.cloneDeep(data.properties);
        let properties = data.properties;
        let Target = data.Target;
        let existingTargets = data.existingTargets;
        let foreignKeyLookup = false;

        // CASE: We cannot look up a foreign key on the target table
        // Transform the value into the target table `id` attribute
        // NOTE: The target table of other relations is always the table itself.
        // e.g. HasMany -> keeps a reference of the foreign key - we don't look up the target table of the foreign key.
        if (existingTargets && existingTargets.relatedData.type === 'belongsToMany') {
            if (properties.hasOwnProperty(existingTargets.relatedData.otherKey)) {
                if (!properties.hasOwnProperty('id')) {
                    properties.id = properties[existingTargets.relatedData.otherKey];
                }

                delete properties[existingTargets.relatedData.otherKey];
                foreignKeyLookup = true;
            }

            if (existingTargets && properties.hasOwnProperty(existingTargets.relatedData.foreignKey)) {
                if (!properties.hasOwnProperty('id')) {
                    properties.id = properties[existingTargets.relatedData.foreignKey];
                }

                delete properties[existingTargets.relatedData.foreignKey];
                foreignKeyLookup = true;
            }
        }

        return Target
            .forge(properties)
            .fetch(_.pick(opts, ['transacting']))
            .then((matching) => {
                if (foreignKeyLookup && !matching) {
                    throw new errors.BookshelfRelationsError({
                        message: 'Cannot find matching target by foreign key.',
                        context: JSON.stringify(originalProperties)
                    });
                }

                return matching;
            })
            .catch((err) => {
                if (err instanceof errors.BookshelfRelationsError) {
                    throw err;
                }

                // ignore e.g. unbinding errors
                return Promise.resolve();
            });
    }

    saveTargets(data, options) {
        let opts = _.cloneDeep(options);
        let existingTargets = data.existingTargets;
        let Target = existingTargets.model;
        let key = data.key;
        let newTargets = data.newTargets || [];
        const pluginOptions = data.pluginOptions;
        const allowedOptions = pluginOptions.allowedOptions || [];
        let results = [];

        return Promise.each(newTargets, (properties) => {
            let existingTarget = existingTargets.findWhere({id: properties.id});
            let model = Target.forge(_.pick(properties, 'id'));

            return new Promise((resolve, reject) => {
                if (!model.id) {
                    return this.getMatchingTarget({
                        Target: Target,
                        properties: properties,
                        existingTargets: existingTargets
                    }, opts).then((matchingTarget) => {
                        if (!matchingTarget) {
                            opts.method = 'insert';
                            return resolve(model);
                        }

                        opts.method = 'update';
                        return resolve(matchingTarget);
                    }).catch(reject);
                }

                if (opts.hasOwnProperty('withRelated') && opts.withRelated.indexOf(key) !== -1 && existingTarget && existingTarget.id) {
                    opts.method = 'update';
                    return resolve(existingTarget);
                }

                model.fetch(_.pick(opts, ['transacting']))
                    .then((result) => {
                        if (!result) {
                            let targetToCreate = Target.forge();
                            opts.method = 'insert';
                            return resolve(targetToCreate);
                        }

                        opts.method = 'update';
                        resolve(result);
                    })
                    .catch(reject);
            }).then((result) => {
                // we have to use the result from the db and add the new properties!
                _.each(_.omit(properties, 'id'), (value, key) => {
                    result.set(key, value);
                });

                // CASE: We found a matching target, but nothing has changed.
                if (result.id && !result.hasChanged()) {
                    results.push(result);
                    return;
                }

                return result.save(null, _.pick(opts, ['transacting', 'method'].concat(allowedOptions)))
                    .then((result) => {
                        results.push(result);
                    });
            });
        }).then(() => {
            return this.bookshelf.Collection.forge(results);
        });
    }
}

module.exports = Detector;
