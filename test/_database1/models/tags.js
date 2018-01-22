'use strict';

const _ = require('lodash');
const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    const proto = bookshelf.Model.prototype;

    let Tag = bookshelf.Model.extend({
        tableName: 'tags',
        relationships: ['meta', 'nested'],

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });

            bookshelf.Model.prototype.initialize.call(this);
        },

        meta: function () {
            return this.hasMany('TagsMeta', 'object_id');
        },

        nested: function () {
            return this.belongsToMany('Tag', 'tags_nested', 'parent_id', 'child_id');
        }
    });

    return {
        Tag: bookshelf.model('Tag', Tag)
    };
};