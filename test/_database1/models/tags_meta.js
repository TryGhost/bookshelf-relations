'use strict';

const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Meta = bookshelf.Model.extend({
        tableName: 'tags_meta',

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });
        }
    });

    return {
        Meta: bookshelf.model('TagsMeta', Meta)
    };
};