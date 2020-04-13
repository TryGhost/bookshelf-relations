module.exports = function (bookshelf) {
    let CustomField = bookshelf.Model.extend({
        tableName: 'custom_fields',
        requireFetch: false,

        posts: function () {
            return this.belongsToMany('Post');
        }
    });

    let CustomFields = bookshelf.Collection.extend({
        model: CustomField
    });

    return {
        CustomField: bookshelf.model('CustomField', CustomField),
        CustomFields: bookshelf.collection('CustomFields', CustomFields)
    };
};
