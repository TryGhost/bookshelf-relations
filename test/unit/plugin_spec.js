const assert = require('node:assert/strict');
const Bookshelf = require('bookshelf');
const Knex = require('knex');
const plugin = require('../../lib/plugin');

require('../utils');

describe('[Unit] plugin', function () {
    let bookshelfMock;
    let knex;

    beforeEach(function () {
        knex = Knex({ client: 'better-sqlite3', useNullAsDefault: true });
        const bookshelf = Bookshelf(knex);
        bookshelfMock = { Model: bookshelf.Model };
        sinon.spy(bookshelfMock.Model, 'extend');
    });

    afterEach(async function () {
        sinon.restore();
        await knex.destroy();
    });

    it('can disable auto hooking', function () {
        plugin(bookshelfMock, { autoHook: false });
        bookshelfMock.Model.extend.called.should.eql(false);
    });

    for (const event of ['saving creating', 'saving updating', 'destroying']) {
        it(`${event}: rejects an unknown relation type`, async function () {
            plugin(bookshelfMock, { autoHook: true });
            const TestModel = bookshelfMock.Model.extend({ relationships: ['fake'] });
            const model = new TestModel({ fake: 'fake' });

            await assert.rejects(model.triggerThen(event, model, {}, {}), {
                message: 'No relation found.',
                code: 'UNKNOWN_RELATION',
            });
        });
    }

    it('creating: defers hasOne updates until the parent is saved', async function () {
        plugin(bookshelfMock, { autoHook: true });

        let TestModel = bookshelfMock.Model.extend(
            {
                relationships: ['fake'],
            },
            {},
        );

        let testModel = new TestModel();
        testModel.set('fake', {
            name: 'fake',
        });

        testModel.related = function () {
            return {};
        };

        testModel.fake = function () {
            this.relatedData = {
                type: 'hasOne',
            };

            return this;
        };

        sinon.spy(bookshelfMock.manager, 'updateRelations');

        await testModel.triggerThen('saving creating', testModel, {}, {});

        bookshelfMock.manager.updateRelations.called.should.eql(false);
        // oxlint-disable-next-line no-underscore-dangle -- Plugin state uses this API name.
        assert.deepEqual(testModel._relations.hasOne.fake, { name: 'fake' });
        assert.equal(testModel.has('fake'), false);
    });
});
