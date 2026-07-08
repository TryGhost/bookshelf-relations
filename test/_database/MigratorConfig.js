const config = require('../../config');
const path = require('path');

const getDatabaseConfig = function getDatabaseConfig() {
    return JSON.parse(JSON.stringify(config.get('database')));
};

module.exports = {
    currentVersion: '1.0',
    database: getDatabaseConfig(),
    migrationPath: path.join(__dirname, 'migrations'),
};
