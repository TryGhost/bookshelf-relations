const assert = require('assert');
const stripNonRelationalValues = require('../../../lib/utils/strip-relational-values');

describe('[Unit] strip relational values', function () {
    it('strips all properties on an object but id', function () {
        const loadsOfProps = {
            id: 'keep me',
            name: 'throwaway'
        };
        const result = stripNonRelationalValues(loadsOfProps);
        assert.deepEqual(result, {id: 'keep me'});
    });

    it('return empty when no id property present', function () {
        const loadsOfProps = {
            name: 'throwaway'
        };
        const result = stripNonRelationalValues(loadsOfProps);
        assert.deepEqual(result, {});
    });

    it('strips all properties on an objects in array but ids', function () {
        const loadsOfProps = [{
            id: 'keep me',
            name: 'throwaway'
        }, {
            id: 'good prop',
            slug: 'bad prop'
        }];
        const result = stripNonRelationalValues(loadsOfProps);
        assert.deepEqual(result, [{id: 'keep me'}, {id: 'good prop'}]);
    });

    it('return empty when no id property present in array of objects', function () {
        const loadsOfProps = [{
            name: 'throwaway'
        }, {
            slug: 'remove me'
        }];
        const result = stripNonRelationalValues(loadsOfProps);
        assert.deepEqual(result, [{}, {}]);
    });
});
