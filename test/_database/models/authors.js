module.exports = function (bookshelf) {
    let Author = bookshelf.Model.extend({
        tableName: 'authors',
        requireFetch: false
    });

    return {
        Author: bookshelf.model('Author', Author)
    };
};
