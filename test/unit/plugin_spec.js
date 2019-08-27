const sinon = require('sinon');
const Bookshelf = require('bookshelf');
const Knex = require('knex');
const plugin = require('../../lib/plugin');

describe('[Unit] plugin', function () {
    let bookshelfMock = {};

    beforeEach(function () {
        const bookshelf = Bookshelf(Knex({client: 'sqlite3', useNullAsDefault: true}));
        bookshelfMock.Model = bookshelf.Model;
        sinon.spy(bookshelfMock.Model, 'extend');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can disable auto hooking', function () {
        plugin(bookshelfMock, {autoHook: false});
        bookshelfMock.Model.extend.called.should.eql(false);
    });

    it('creating: unknown relation type', function () {
        plugin(bookshelfMock, {autoHook: true});

        let TestModel = bookshelfMock.Model.extend({
            relationships: ['fake']
        }, {});

        let testModel = new TestModel();
        testModel.set('fake', 'fake');

        testModel.emit('saving', testModel);

        try {
            testModel.emit('creating', testModel);
        } catch (err) {
            err.message.should.eql('No relation found.');
        }
    });

    it('saved: unknown relation type', function () {
        plugin(bookshelfMock, {autoHook: true});

        let TestModel = bookshelfMock.Model.extend({
            relationships: ['fake']
        }, {});

        let testModel = new TestModel();
        testModel.set('fake', 'fake');

        testModel.emit('saving', testModel);

        try {
            testModel.emit('saved', testModel);
        } catch (err) {
            err.message.should.eql('No relation found.');
        }
    });

    it('destroying: unknown relation type', function () {
        plugin(bookshelfMock, {autoHook: true});

        let TestModel = bookshelfMock.Model.extend({
            relationships: ['fake']
        }, {});

        let testModel = new TestModel();
        testModel.set('fake', 'fake');

        testModel.emit('saving', testModel);

        try {
            testModel.emit('destroying', testModel);
        } catch (err) {
            err.message.should.eql('No relation found.');
        }
    });

    it('creating: expect no relationship update', function () {
        plugin(bookshelfMock, {autoHook: true});

        let TestModel = bookshelfMock.Model.extend({
            relationships: ['fake']
        }, {});

        let testModel = new TestModel();
        testModel.set('fake', {
            name: 'fake'
        });

        testModel.related = function () {
            return {};
        };

        testModel.fake = function () {
            this.relatedData = {
                type: 'hasOne'
            };

            return this;
        };

        sinon.spy(bookshelfMock.manager, 'updateRelations');

        testModel.emit('saving', testModel);
        testModel.emit('creating', testModel);

        bookshelfMock.manager.updateRelations.called.should.eql(false);
    });
});
