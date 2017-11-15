module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let News = bookshelf.Model.extend({
        tableName: 'news'
    });

    return {
        News: bookshelf.model('News', News)
    };
};