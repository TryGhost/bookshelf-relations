const _ = require('lodash');
const Bookshelf = require('bookshelf');
const Relations = require('../../lib/relations');

describe('[Unit] relations', function () {
    let relations;
    let bookshelf;

    beforeEach(function () {
        bookshelf = Bookshelf();
        relations = new Relations();
    });
});