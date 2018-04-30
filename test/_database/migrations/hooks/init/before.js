const models = require('../../../models');

module.exports = function (options) {
    const connection = options.connection;
    return models.init(connection);
};