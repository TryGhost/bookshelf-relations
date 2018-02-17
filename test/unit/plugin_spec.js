'use strict';

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

    it('event call order (1)', function (done) {
        plugin(bookshelfMock, {autoHook: true});

        sandbox.stub(bookshelfMock.manager, 'updateRelations').resolves();

        let TestModel = bookshelfMock.Model.extend({
            relationships: ['fake'],
            initialize: function () {
                let createdCalled = false;

                this.on('created', function () {
                    bookshelfMock.manager.updateRelations.calledOnce.should.eql(false);
                    createdCalled = true;
                });

                this.on('saved', function () {
                    bookshelfMock.manager.updateRelations.calledOnce.should.eql(true);
                    createdCalled.should.eql(true);
                    done();
                });

                bookshelfMock.Model.prototype.initialize.apply(this, arguments);
            }
        }, {});

        let testModel = new TestModel();
        testModel.fake = function () {
            return {
                relatedData: {
                    type: 'belongsToMany'
                }
            }
        };

        testModel.related = function () {
            return {};
        };

        testModel.set('fake', 'fake');
        testModel.emit('saving', testModel);
        testModel.emit('created', testModel);
        testModel.emit('saved', testModel);
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