'use strict';

const ObjectId = require('bson-objectid');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Revision = bookshelf.Model.extend({
        tableName: 'revisions',

        initialize: function () {
            this.on('creating', function onCreating(newObj) {
                if (!newObj.id) {
                    newObj.set('id', ObjectId.generate());
                }
            });
        }
    });

    return {
        Author: bookshelf.model('Revision', Revision)
    };
};