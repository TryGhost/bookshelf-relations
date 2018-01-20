'use strict';

const _ = require('lodash');
const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Tag = bookshelf.Model.extend({
        tableName: 'tags',

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });

            this.on('saving', function (model) {
                const allowedFields = ['id', 'slug', 'parent_id'];

                _.each(model.toJSON(), (value, key) => {
                    if (allowedFields.indexOf(key) === -1) {
                        model.unset(key);
                    }
                });
            });
        }
    });

    return {
        Tag: bookshelf.model('Tag', Tag)
    };
};