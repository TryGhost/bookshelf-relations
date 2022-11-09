const _ = require('lodash');
const Promise = require('bluebird');

require('../../utils');

module.exports = function (bookshelf) {
    bookshelf.plugin(require('../../../lib/plugin'), {
        extendChanged: '_changed',
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
        requireFetch: false,

        relationships: ['tags', 'news', 'custom_fields', 'author', 'events', 'newsletter'],

        relationshipConfig: {
            tags: {
                editable: true
            },
            news: {
                editable: true
            },
            author: {
                editable: true
            },
            custom_fields: {
                editable: true
            },
            events: {
                editable: true,
                destroyRelated: false
            },
            newsletter: {
                // setting 'false' below is not necessary, as it's a default value
                // it is here for illustrative purposes
                editable: false
            }
        },

        initialize: function () {
            bookshelf.Model.prototype.initialize.call(this);

            this.on('updating', function (model) {
                model._changed = _.cloneDeep(model.changed);
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
        },

        newsletter: function () {
            return this.belongsTo('Newsletter', 'newsletter_id');
        },

        events: function () {
            return this.hasMany('Events', 'post_id');
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
