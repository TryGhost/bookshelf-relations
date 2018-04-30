module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Author = bookshelf.Model.extend({
        tableName: 'authors'
    });

    return {
        Author: bookshelf.model('Author', Author)
    };
};