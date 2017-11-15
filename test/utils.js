'use strict';

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'testing';
}

require('should');

const knex = require('knex');
const path = require('path');
const KnexMigrator = require('knex-migrator');
const config = require('../config');
const models = require('./_database/models');
const knexMigrator = new KnexMigrator({
    knexMigratorFilePath: path.join(__dirname, '_database')
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
        return knexMigrator.reset({force: true})
            .then(() => {
                if (!connection) {
                    return;
                }

                return connection.destroy();
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