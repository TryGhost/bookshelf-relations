const _ = require('lodash');
const errors = require('@tryghost/errors');

module.exports = function (bookshelf) {
    let Tag = bookshelf.Model.extend({
        tableName: 'tags',
        requireFetch: false,

        initialize: function () {
            this.on('saving', function (model) {
                const allowedFields = ['id', 'slug'];

                _.each(model.toJSON(), (value, key) => {
                    if (allowedFields.indexOf(key) === -1) {
                        model.unset(key);
                    }
                });

                if (model.get('slug').length === 0) {
                    throw new errors.ValidationError({message: 'Slug should not be empty'});
                }
            });
        }
    });

    return {
        Tag: bookshelf.model('Tag', Tag)
    };
};
