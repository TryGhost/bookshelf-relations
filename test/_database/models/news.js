module.exports = function (bookshelf) {
    let News = bookshelf.Model.extend({
        tableName: 'news',
        requireFetch: false
    }, {
        add: function (data, options) {
            options = options || {};

            return bookshelf.transaction((transacting) => {
                options.transacting = transacting;

                let news = this.forge(data);
                return news.save(null, options);
            });
        }

    });

    return {
        News: bookshelf.model('News', News)
    };
};
