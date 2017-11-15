const _ = require('lodash');
const Relations = require('./relations');

module.exports = function relationsPlugin(bookshelf, pluginOptions) {
    if (!bookshelf.manager) {
        bookshelf.manager = new Relations(bookshelf);
    }

    let opts = _.merge({
        unsetRelations: true,
        autoHook: true
    }, pluginOptions);

    if (!opts.autoHook) {
        return;
    }

    let Model = bookshelf.Model.extend({
        initialize: function initialize() {
            this.on('creating', function (model, attributes, options) {
                if (!this.relationships) {
                    return;
                }

                let relations = {};

                this.relationships.forEach((key) => {
                    if (this.hasChanged(key)) {
                        let value = model.related(key);
                        let relation = (model[key] instanceof Function && (typeof value === 'object' || Array.isArray(value))) ? model[key](model) : null;
                        let type = relation ? relation.relatedData.type : null;

                        if (!type) {
                            throw new Error('No relation found.');
                        }

                        if (['belongsTo'].indexOf(type) !== -1) {
                            relations[key] = model.get(key);
                        }
                    }
                });

                if (!Object.keys(relations).length) {
                    return;
                }

                return bookshelf.manager.updateRelations({
                    model: model,
                    relations: relations,
                    pluginOptions: opts.hooks
                }, options);
            });

            this.on('saving', (model) => {
                if (!this.relationships) {
                    return;
                }

                this.relationships.forEach((key) => {
                    if (this.hasChanged(key)) {
                        this['relationships_' + key] = model.get(key);

                        if (opts.unsetRelations) {
                            this.unset(key);
                        }
                    }
                });
            });

            this.on('saved', (model, attributes, options) => {
                if (!this.relationships) {
                    return;
                }

                let relations = {};

                this.relationships.forEach((key) => {
                    if (this['relationships_' + key]) {
                        let value = model.related(key);
                        let relation = (model[key] instanceof Function && (typeof value === 'object' || Array.isArray(value))) ? model[key](model) : null;
                        let type = relation ? relation.relatedData.type : null;

                        if (!type) {
                            throw new Error('No relation found.');
                        }

                        if (['belongsTo'].indexOf(type) !== -1 && options.method === 'insert') {
                            return;
                        }

                        relations[key] = this['relationships_' + key];
                    }
                });

                if (!Object.keys(relations).length) {
                    return;
                }

                return bookshelf.manager.updateRelations({
                    model: model,
                    relations: relations,
                    pluginOptions: opts.hooks
                }, options).then(() => {
                    this.relationships.forEach((key) => {
                        if (this['relationships_' + key]) {
                            delete this['relationships_' + key];
                        }
                    });
                });
            });

            this.on('destroying', function (model, options) {
                if (!this.relationships) {
                    return;
                }

                let relations = {};

                this.relationships.forEach((key) => {
                    let value = model.related(key);
                    let relation = (model[key] instanceof Function && (typeof value === 'object' || Array.isArray(value))) ? model[key](model) : null;
                    let type = relation ? relation.relatedData.type : null;

                    if (!type) {
                        throw new Error('No relation found.');
                    }

                    if (['belongsToMany', 'hasMany'].indexOf(type) !== -1) {
                        relations[key] = [];
                    } else {
                        relations[key] = {};
                    }
                });

                if (!Object.keys(relations).length) {
                    return;
                }

                return bookshelf.manager.updateRelations({
                    model: model,
                    relations: relations,
                    pluginOptions: opts.hooks
                }, options).then(() => {
                    this.relationships.forEach((key) => {
                        if (this['relationships_' + key]) {
                            delete this['relationships_' + key];
                        }
                    });
                });
            });
        }
    });

    bookshelf.Model = Model;
};
