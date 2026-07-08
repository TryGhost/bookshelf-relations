if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'testing';
}

const knex = require('knex');
const path = require('path');
const KnexMigrator = require('knex-migrator');
const config = require('../../config');
const models = require('../_database/models');

let connection;
const migrationRoot = path.join(__dirname, '../', '_database');

const getDatabaseConfig = function getDatabaseConfig() {
    return JSON.parse(JSON.stringify(config.get('database')));
};

const createKnexMigrator = function createKnexMigrator() {
    return new KnexMigrator({
        knexMigratorConfig: {
            currentVersion: '1.0',
            database: getDatabaseConfig(),
            migrationPath: path.join(migrationRoot, 'migrations')
        }
    });
};

exports.database = {
    getConnection: function () {
        return connection;
    },
    connect: function connect() {
        return knex(getDatabaseConfig());
    },
    init: function () {
        return createKnexMigrator().init()
            .then(() => {
                return knex(getDatabaseConfig());
            })
            .then((_connection) => {
                connection = _connection;
                return models.init(connection);
            });
    },
    reset: function () {
        if (!connection) {
            return createKnexMigrator().reset({force: true});
        }

        return connection.destroy()
            .then(() => {
                connection = null;
                return createKnexMigrator().reset({force: true});
            });
    }
};

let fixtures = {
    posts: [],
    tiers: [],
    newsletters: [],
    news: []
};

exports.fixtures = {
    add: function (key, obj) {
        fixtures[key].push(obj);
    },
    getAll: function (key) {
        return key ? fixtures[key] : fixtures;
    }
};
