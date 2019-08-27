const _ = require('lodash');

module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Tag = bookshelf.Model.extend({
        tableName: 'tags',

        initialize: function () {
            this.on('saving', function (model) {
                const allowedFields = ['id', 'slug'];

                _.each(model.toJSON(), (value, key) => {
                    if (allowedFields.indexOf(key) === -1) {
                        model.unset(key);
                    }
                });
            });
        }
    });

    return {
        Tag: bookshelf.model('Tag', Tag)
    };
};
