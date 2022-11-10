module.exports = function (bookshelf) {
    let Tier = bookshelf.Model.extend({
        tableName: 'tiers',
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
        Tier: bookshelf.model('Tier', Tier)
    };
};
