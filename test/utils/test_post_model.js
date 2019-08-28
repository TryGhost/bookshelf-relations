const _ = require('lodash');
const models = require('../_database/models');

module.exports = function testPostModel(testCase) {
    let args = testCase.values || {};
    let options = testCase.options || {};

    if (_.includes(['edit', 'destroy', 'fetch'], testCase.method) && !testCase.id) {
        throw new Error(`Missing id for ${testCase.method} test case`);
    }

    if (!testCase.expectError && !testCase.expectSuccess) {
        throw new Error('Missing expectations for test case');
    }

    if (testCase.id) {
        args.id = testCase.id;
    }

    if (_.isEmpty(args)) {
        args = options;
        options = undefined;
    }

    return models.Post[testCase.method](args, options)
        .then(function (result) {
            if (testCase.expectSuccess) {
                return testCase.expectSuccess(result);
            }

            throw new Error('Missing expectations for test case - were you expecting an error?');
        })
        .catch(function (err) {
            if (testCase.expectError) {
                return testCase.expectError(err);
            }

            throw err;
        });
};
