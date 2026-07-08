# Bookshelf Relations

Bookshelf Relations is a Bookshelf.js plugin for applying nested relation changes while saving a model.

It lets API payloads insert, update, attach, detach, and remove related records through the parent Bookshelf model. The plugin supports `belongsTo`, `belongsToMany`, `hasOne`, and `hasMany` relations and is used by Ghost model code that accepts relational data such as tags, authors, and related settings.

## Requirements

- Node.js `^18.12.1 || ^20.11.1 || ^22.13.1`
- Bookshelf `>=1.1.0`

## Install

```sh
pnpm add bookshelf-relations
```

or

```sh
npm install bookshelf-relations --save
```

## Usage

### Transactions

Use [Bookshelf transactions](https://bookshelfjs.org/api.html#Bookshelf-instance-transaction) when inserting, updating, or deleting models with nested relation data. Updating relations requires additional database queries, so transactions keep the parent model and related records from being partially written if one query fails.

## Options

| hook                    | type    | default | description                                                                                                                                                                                             |
| ----------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| autoHook                | Boolean | true    | The plugin takes over everything for you and hooks into the Bookshelf workflow.                                                                                                                         |
| allowedOptions          | Array   | -       | An array of allowed model options the plugin passes on when executing Bookshelf queries.                                                                                                                |
| unsetRelations          | Boolean | true    | The plugin will unset the relations after they are detected (e.g. `model.unset('tags')`). If you are disabling "autoHook", you manually need to unset the relations.                                    |
| editRelations           | Boolean | true    | If `false` value is passed in the plugin will not edit the properties of related models unless specified otherwise on model-level `relationshipConfig` through `editable` flag.                         |
| extendChanged           | String  | -       | Define a variable name and Bookshelf-relations will store the information which relations were changed.                                                                                                 |
| attachPreviousRelations | Boolean | false   | An option to attach previous relations. Bookshelf-relations attaches this information as `_previousRelations` on the target parent model.                                                               |
| hooks                   | Object  | -       | <ul><li>**belongsToMany**: Hook into the process of updating belongsToMany relationships. </ul> <br><br> **Example**: ```hooks: {belongsToMany: {after: Function, before: Function}}``` |

Take a look [at the plugin configuration in Ghost](https://github.com/TryGhost/Ghost/blob/2.21.0/core/server/models/base/index.js#L52).

## Hooks

Hooks can be defined globally on the plugin options as described above, or they can be defined on a model-by-model basis.
A model hook will replace a global hook if present - only one of them will run.

Hooks should have a structure like so:

```js
hooks: {
    belongsToMany: {
        before() {},
        after() {}
    }
}
```

The hooks we support are:
 - `belongsToMany`
    - `before` / `beforeRelationCreation`
    - `after` / `afterRelationCreated`

Either name can be used but the shorter name will be preferred if both exist.

## Automatic

The plugin will automatically deal with relationships upserts and cascading deletions through hasMany relationships.
It's required to register your relationships in Bookshelf before you can use bookshelf-relations, see [this example](https://github.com/TryGhost/Ghost/blob/2.21.0/core/server/models/post.js#L502).

1. Register the plugin.

```js
    bookshelf.plugin(require('bookshelf-relations'), options);
```

2. Define your relationships on each model.

```js
    bookshelf.Model.extend({
        relationships: ['tags', 'news']
    }, {...});
```

To opt-out of automatic child record deletion for `hasMany` relationships it's possible to define per-relationship config:

```js
    bookshelf.Model.extend({
        relationships: ['tags', 'news', 'events'],
        relationshipConfig: {
            events: {
                destroyRelated: false
            }
        }
    });
```

To opt-in for automatic relation editing pass in `editable` flag in per-relationship config:

```js
    bookshelf.Model.extend({
        relationships: ['tags', 'news', 'events'],
        relationshipConfig: {
            tags: {
                editable: true
            }
        }
    });
```

## Manual

You manually need to call the plugin to update relationships.
It's required to register your relationships in Bookshelf before you can use bookshelf-relations, see [this example](https://github.com/TryGhost/Ghost/blob/2.21.0/core/server/models/post.js#L502).

1. Register the plugin.

```js
    bookshelf.plugin(require('bookshelf-relations'), options);
```

2. Manually call bookshelf-relations.

```js
    bookshelf.manager.updateRelations({
        model: model,
        relations: {tags: [...]},
        pluginOptions: {options}
    });
```

## Notations

```js
// will detach & remove all existing relations
model.set('tags', []);

// will check if "test" exists and if not, it will insert the target tag
// will remove all previous relations if exist
model.set('tags', [{slug: 'test'}]);
```

## Development

- `pnpm install` to install dependencies with the pinned package manager
- `pnpm test` to run tests and lint
- `pnpm lint` to run oxlint and oxfmt checks
- `pnpm coverage` to run test coverage
- `NODE_ENV=testing-mysql pnpm test` to run tests with MySQL
- `pnpm perf` to run a performance test

## Publish

Use `pnpm ship` to prepare a release. Publishing to npm runs from `.github/workflows/publish.yml` on `main` when `package.json` changes, using npm trusted publishing with provenance.

## Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
