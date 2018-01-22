'use strict';

const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Meta = bookshelf.Model.extend({
        tableName: 'tags_nested',

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });
        }
    });

    return {
        TagsNested: bookshelf.model('TagsNested', Meta)
    };
};