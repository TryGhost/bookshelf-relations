module.exports = function (bookshelf) {
    let Newsletter = bookshelf.Model.extend({
        tableName: 'newsletters',
        requireFetch: false
    });

    return {
        Newsletter: bookshelf.model('Newsletter', Newsletter)
    };
};
