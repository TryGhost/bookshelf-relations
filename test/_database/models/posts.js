const _ = require('lodash');
const Promise = require('bluebird');

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
                }
            }
        }
    });

    let Post = bookshelf.Model.extend({
        tableName: 'posts',

        relationships: ['tags', 'news', 'custom_fields', 'author'],

        initialize: function () {
            bookshelf.Model.prototype.initialize.call(this);
        },

        tags: function () {
            return this.belongsToMany('Tag').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
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