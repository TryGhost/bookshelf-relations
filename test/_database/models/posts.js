const _ = require('lodash');
const Promise = require('bluebird');
require('should');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    bookshelf.plugin(require('../../../lib/plugin'), {
        hooks: {
            belongsToMany: {
                after: function (existing, targets, options) {
                    return Promise.each(targets.models, function (target, index) {
                        return existing.updatePivot({
                            sort_order: index
                        }, _.extend({}, options, {query: {where: {tag_id: target.id}}}));
                    });
                },
                beforeRelationCreation: function (collection, data, opts) {
                    // do nothing, just ensure the syntax is correct
                    should.exist(collection);
                    should.exist(data);
                    should.exist(opts);
                }
            }
        }
    });

    let Post = bookshelf.Model.extend({
        tableName: 'posts',

        relationships: ['tags', 'news', 'custom_fields', 'author'],

        initialize: function () {
            bookshelf.Model.prototype.initialize.call(this);

            this.on('updating', function (model) {
                model._changed = _.cloneDeep(model.changed);
                console.log('updating', this._changed);
            });

            this.on('updated', function (model) {
                console.log('updated', model._changed);
            });
        },

        tags: function () {
            return this.belongsToMany('Tag', 'posts_tags', 'post_id', 'tag_id').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
        },

        news: function () {
            return this.hasOne('News', 'post_id');
        },

        custom_fields: function () {
            return this.hasMany('CustomFields', 'post_id');
        },

        author: function () {
            return this.belongsTo('Author', 'author_id');
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

    return {
        Post: bookshelf.model('Post', Post)
    };
};
