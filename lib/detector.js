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
        let target = data.target;
        let properties = data.properties;
        let fk = data.fk;
        let saveValue = data.saveValue;
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
                return resolve(existingRelation);
            }

            target.fetch(_.pick(opts, ['transacting']))
                .then((result) => {
                    if (!result) {
                        opts.method = 'insert';
                        return resolve(target);
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

                return result.where(fk.key, fk.value).destroy(_.pick(opts, ['transacting']));
            }

            _.each(properties, (value, key) => {
                result.set(key, value);
            });

            return result.save(saveValue, _.pick(opts, ['transacting', 'method']))
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

    saveTargets(data, options) {
        let opts = _.cloneDeep(options);
        let existingTargets = data.existingTargets;
        let newTargets = data.newTargets || [];
        let results = [];

        return Promise.each(newTargets, (properties) => {
            let exists = existingTargets.findWhere({id: properties.id});
            let model = exists ? exists : existingTargets.model.forge(_.pick(properties, 'id'));

            return new Promise((resolve, reject) => {
                if (!model.id) {
                    opts.method = 'insert';
                    return resolve(model);
                }

                model.fetch(_.pick(opts, ['transacting']))
                    .then((result) => {
                        if (!result) {
                            opts.method = 'insert';
                            return resolve(model);
                        }

                        opts.method = 'update';
                        resolve(result);
                    })
                    .catch(reject);
            }).then((result) => {
                // we have to use the result from the db and add the new properties!
                _.each(properties, (value, key) => {
                    result.set(key, value);
                });

                return result.save(null, _.pick(opts, ['transacting', 'method']))
                    .then((result) => {
                        results.push(result);
                    })
                    .catch((err) => {
                        throw err;
                    });
            });
        }).then(() => {
            return this.bookshelf.Collection.forge(results);
        });
    }
}

module.exports = Detector;
