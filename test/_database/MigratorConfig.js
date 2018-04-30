const config = require('../../config');
const path = require('path');

module.exports = {
    currentVersion: '1.0',
    database: config.get('database'),
    migrationPath: path.join(__dirname, 'migrations')
};