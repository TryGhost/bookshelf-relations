module.exports = function (bookshelf) {
    let Newsletter = bookshelf.Model.extend({
        tableName: 'newsletters',
        requireFetch: false
    }, {
        add: function (data, options) {
            options = options || {};

            return bookshelf.transaction((transacting) => {
                options.transacting = transacting;

                let model = this.forge(data);
                return model.save(null, options);
            });
        }
    });

    return {
        Newsletter: bookshelf.model('Newsletter', Newsletter)
    };
};
