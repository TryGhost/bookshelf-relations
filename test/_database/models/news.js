module.exports = function (bookshelf) {
    let News = bookshelf.Model.extend({
        tableName: 'news',
        requireFetch: false
    });

    return {
        News: bookshelf.model('News', News)
    };
};
