# Bookshelf Relations

Bookshelf Relations is a Bookshelf.js plugin for applying nested relation changes while saving a model.

It lets API payloads insert, update, attach, detach, and remove related records through the parent Bookshelf model. The plugin supports `belongsTo`, `belongsToMany`, `hasOne`, and `hasMany` relations and is used by Ghost model code that accepts relational data such as tags, authors, and related settings.

## Requirements

- Node.js: see `engines.node` in [package.json](package.json)
- Bookshelf: see `peerDependencies.bookshelf` in [package.json](package.json)

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

| option                  | type    | default | description                                                                                                                                                                                             |
| ----------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| autoHook                | Boolean | true    | The plugin takes over everything for you and hooks into the Bookshelf workflow.                                                                                                                         |
| allowedOptions          | Array   | -       | An array of allowed model options the plugin passes on when executing Bookshelf queries.                                                                                                                |
| editRelations           | Boolean | true    | If `false` value is passed in the plugin will not edit the properties of related models unless specified otherwise on model-level `relationshipConfig` through `editable` flag.                         |
| extendChanged           | String  | -       | Define a variable name and Bookshelf-relations will store the information which relations were changed.                                                                                                 |
| attachPreviousRelations | Boolean | false   | An option to attach previous relations. Bookshelf-relations attaches this information as `_previousRelations` on the target parent model.                                                               |
| unsetRelations          | Boolean | true    | Accepted but currently has no effect. Automatic mode always unsets relation attributes on the parent model before saving it, whatever this option is set to.                                            |
| hooks                   | Object  | -       | Functions to run while updating `belongsToMany` relationships. See [Hooks](#hooks).                                                                                                                     |

In manual mode, unset any relation attributes yourself before saving the parent.

Take a look [at the plugin configuration in Ghost](https://github.com/TryGhost/Ghost/blob/f962ce37734ae6296ea8af126f76a209d303c354/ghost/core/server/models/base/bookshelf.js#L73-L112).

## Hooks

Hooks let you run code while the plugin attaches and detaches `belongsToMany` relations through their join table, for example to set extra pivot columns or store a sort order.

Hooks can be defined globally in the plugin `hooks` option, or on a model-by-model basis with a `hooks` property on the model. Each hook phase is resolved separately: if the model defines either name for a phase (for example `before` or `beforeRelationCreation`), it replaces the global hook for that phase and only one of them runs.

| hook     | alias                    | runs                                                                        | arguments                      |
| -------- | ------------------------ | --------------------------------------------------------------------------- | ------------------------------ |
| `before` | `beforeRelationCreation` | once for each join-table row the plugin inserts, before the row is inserted | `(collection, data, options)`  |
| `after`  | `afterRelationCreated`   | once per `belongsToMany` relation update, after attaching and detaching     | `(existing, targets, options)` |

Either name can be used; if one hooks object defines both, the shorter name is used.

- `collection` / `existing`: the parent model's Bookshelf `belongsToMany` collection, which supports methods such as `updatePivot`.
- `data`: the join-table row about to be inserted, for example `{post_id: 1, tag_id: 2}`. Properties you add to it are inserted with the row.
- `targets`: a collection of the related models the parent now points to, in the order they were passed in.
- `options`: a copy of the query options passed to the save or `updateRelations` call, for example `transacting`.

Model hooks are called with `this` bound to the parent model; global hooks are called without a `this` binding. A hook can return a promise, and the plugin waits for it before continuing.

```js
bookshelf.plugin(require('bookshelf-relations'), {
    hooks: {
        belongsToMany: {
            before(collection, data, options) {
                data.id = generateId(); // your own id generator
            },
            after(existing, targets, options) {
                // store the requested order in the join table
                return Promise.all(targets.models.map((target, index) => {
                    return existing.updatePivot({sort_order: index}, Object.assign({}, options, {
                        query: {where: {[existing.relatedData.otherKey]: target.id}}
                    }));
                }));
            }
        }
    }
});

bookshelf.Model.extend({
    relationships: ['tags'],
    hooks: {
        belongsToMany: {
            after(existing, targets, options) {
                // replaces the global `after` hook for this model; `this` is the parent model
            }
        }
    }
});
```

## Automatic

The plugin will automatically deal with relationships upserts and cascading deletions through hasMany relationships.
It's required to register your relationships in Bookshelf before you can use bookshelf-relations, see the [`tags` relation](https://github.com/TryGhost/Ghost/blob/f962ce37734ae6296ea8af126f76a209d303c354/ghost/core/server/models/post.js#L1085-L1097) and [`relationships` config](https://github.com/TryGhost/Ghost/blob/f962ce37734ae6296ea8af126f76a209d303c354/ghost/core/server/models/post.js#L101-L125) in Ghost's post model.

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

Disable automatic hooks to update relationships manually.
It's required to register your relationships in Bookshelf before you can use bookshelf-relations, see the [`tags` relation](https://github.com/TryGhost/Ghost/blob/f962ce37734ae6296ea8af126f76a209d303c354/ghost/core/server/models/post.js#L1085-L1097) and [`relationships` config](https://github.com/TryGhost/Ghost/blob/f962ce37734ae6296ea8af126f76a209d303c354/ghost/core/server/models/post.js#L101-L125) in Ghost's post model.

1. Register the plugin with automatic hooks disabled.

```js
const pluginOptions = {autoHook: false};
bookshelf.plugin(require('bookshelf-relations'), pluginOptions);
```

2. Update the relations inside a transaction, passing plugin options and query options separately. This example uses an existing, saved parent `model` with a `belongsToMany` `tags` relation and an existing tag with ID `1`. It replaces the parent's tag associations with that tag.

```js
bookshelf.transaction((transacting) => {
    return bookshelf.manager.updateRelations({
        model: model,
        relations: {tags: [{id: 1}]},
        pluginOptions: pluginOptions
    }, {transacting: transacting});
});
```

`updateRelations` returns a promise and updates relations only; save any parent attributes separately in the same transaction.

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
- `pnpm perf` to run a performance test; it always uses MySQL (`config/env/config.testing-mysql.json`), so it needs a local MySQL database. Override connection settings with `database__connection__*` env vars, for example `database__connection__password=root pnpm perf`

## Publish

Use `pnpm ship` to prepare a release. Publishing to npm runs from `.github/workflows/publish.yml` on `main` when `package.json` changes, using npm trusted publishing with provenance.

## Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
