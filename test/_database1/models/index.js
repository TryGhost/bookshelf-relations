'use strict';

const _ = require('lodash');
const Bookshelf = require('bookshelf');

exports.init = function (connection) {
    let bookshelf = Bookshelf(connection);

    ['posts', 'tags', 'authors', 'meta', 'revisions', 'tags_meta'].forEach((table) => {
        const Model = require('./' + table);
        _.extend(exports, Model(bookshelf));
    });
};