'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

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

            if (opts.hasOwnProperty('withRelated') && opts.withRelated.indexOf(key) !== -1) {
                opts.method = 'update';
                return resolve(existingRelation);
            }

            target.fetch(_.pick(opts, ['transacting']))
                .then((result) => {
                    if (!result) {
                        opts.method = 'insert';
                        return resolve(Target.forge());
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

        return new Promise((resolve, reject) => {
            if (opts.method === 'insert') {
                return resolve(existingRelations);
            }

            if (opts.hasOwnProperty('withRelated') && opts.withRelated.indexOf(key) !== -1) {
                return resolve(existingRelations);
            }

            return existingRelations.fetch(options)
                .then((existingRelations) => {
                    resolve(existingRelations);
                })
                .catch(reject);
        });
    }

    // @TODO: only search by unique columns
    getMatchingTarget(data, options) {
        let opts = _.cloneDeep(options);
        let properties = data.properties;
        let Target = data.Target;

        return Target
            .forge(properties)
            .fetch(opts)
            .then((matching) => {
                return matching;
            })
            .catch(() => {
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
                    return this.getMatchingTarget({Target: Target, properties: properties}, opts)
                        .then((matchingTarget) => {
                            if (!matchingTarget) {
                                opts.method = 'insert';
                                return resolve(model);
                            }

                            opts.method = 'update';
                            return resolve(matchingTarget);
                        });
                }

                if (opts.hasOwnProperty('withRelated') && opts.withRelated.indexOf(key) !== -1) {
                    opts.method = 'update';
                    return resolve(existingTarget);
                }

                model.fetch(_.pick(opts, ['transacting']))
                    .then((result) => {
                        if (!result) {
                            opts.method = 'insert';
                            return resolve(Target.forge());
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
