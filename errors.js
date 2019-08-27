const errors = require('ghost-ignition').errors,
    util = require('util');

function BookshelfRelationsError(options) {
    options = options || {};

    options.errorType = 'BookshelfRelationsError';
    options.level = 'critical';

    errors.IgnitionError.call(this, options);
}

util.inherits(BookshelfRelationsError, errors.IgnitionError);

module.exports = errors;
module.exports.BookshelfRelationsError = BookshelfRelationsError;
