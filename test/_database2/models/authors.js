'use strict';

const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Author = bookshelf.Model.extend({
        tableName: 'authors',

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });
        }
    });

    return {
        Author: bookshelf.model('Author', Author)
    };
};