module.exports = function (bookshelf) {
    bookshelf.plugin('registry');

    let Tag = bookshelf.Model.extend({
        tableName: 'tags',

        posts: function () {
            return this.belongsToMany('Post');
        }
    });

    return {
        Tag: bookshelf.model('Tag', Tag)
    };
};