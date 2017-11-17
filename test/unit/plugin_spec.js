const sinon = require('sinon');
const _ = require('lodash');
const Bookshelf = require('bookshelf');
const plugin = require('../../lib/plugin');
let sandbox = sinon.sandbox.create();

describe('[Unit] plugin', function () {
    let bookshelfMock = {};

    beforeEach(function () {
        const bookshelf = Bookshelf();
        bookshelfMock.Model = bookshelf.Model;
        sandbox.spy(bookshelfMock.Model, 'extend');
    });

    afterEach(function () {
        sandbox.restore();
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

        testModel['fake'] = function () {
            this.relatedData = {
                type: 'hasOne'
            };

            return this;
        };

        sandbox.spy(bookshelfMock.manager, 'updateRelations');

        testModel.emit('saving', testModel);
        testModel.emit('creating', testModel);

        bookshelfMock.manager.updateRelations.called.should.eql(false);
    });
});