const _ = require('lodash');
const Bookshelf = require('bookshelf');

exports.init = function (connection) {
    let bookshelf = Bookshelf(connection);

    ['posts', 'tags', 'news', 'custom_fields', 'authors', 'events', 'newsletter'].forEach((table) => {
        const Model = require('./' + table);
        _.extend(exports, Model(bookshelf));
    });
};
