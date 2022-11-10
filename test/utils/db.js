if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'testing';
}

const knex = require('knex');
const path = require('path');
const KnexMigrator = require('knex-migrator');
const config = require('../../config');
const models = require('../_database/models');
const knexMigrator = new KnexMigrator({
    knexMigratorFilePath: path.join(__dirname, '../', '_database')
});

let connection;

exports.database = {
    getConnection: function () {
        return connection;
    },
    connect: function connect() {
        return knex(config.get('database'));
    },
    init: function () {
        return knexMigrator.init()
            .then(() => {
                return knex(config.get('database'));
            })
            .then((_connection) => {
                connection = _connection;
                return models.init(connection);
            });
    },
    reset: function () {
        if (!connection) {
            return knexMigrator.reset({force: true});
        }

        return connection.destroy()
            .then(() => {
                return knexMigrator.reset({force: true});
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
