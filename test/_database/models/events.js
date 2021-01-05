module.exports = function (bookshelf) {
    let Event = bookshelf.Model.extend({
        tableName: 'events',
        requireFetch: false,

        post: function () {
            return this.belongsTo('Post', 'post_id');
        }
    });

    let Events = bookshelf.Collection.extend({
        model: Event
    });

    return {
        Event: bookshelf.model('Event', Event),
        Events: bookshelf.model('Events', Events)
    };
};
