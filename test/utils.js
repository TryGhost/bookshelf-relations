'use strict';

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'testing';
}

require('should');

const knex = require('knex');
const path = require('path');
const KnexMigrator = require('knex-migrator');
const config = require('../config');
let connection;

exports.database = {
    getConnection: function () {
        return connection;
    },
    connect: function connect() {
        return knex(config.get('database'));
    },
    init: function (options) {
        options = options || {};
        const dbName = options.dbName || '_database';
        const models = require('./' + dbName + '/models');
        let knexMigrator = new KnexMigrator({
            knexMigratorFilePath: path.join(__dirname, dbName)
        });

        return knexMigrator.init()
            .then(() => {
                return knex(config.get('database'));
            })
            .then((_connection) => {
                connection = _connection;
                return models.init(connection);
            })
            .finally(() => {
                knexMigrator = null;
            });
    },
    reset: function (options) {
        options = options || {};
        const dbName = options.dbName || '_database';

        let knexMigrator = new KnexMigrator({
            knexMigratorFilePath: path.join(__dirname, dbName)
        });

        return knexMigrator.reset({force: true})
            .then(() => {
                if (!connection) {
                    return;
                }

                return connection.destroy();
            })
            .finally(() => {
                knexMigrator = null;
            });
    }
};

let fixtures = {
    posts: []
};

exports.fixtures = {
    add: function (key, obj) {
        fixtures[key].push(obj);
    },
    getAll: function () {
        return fixtures;
    }
};