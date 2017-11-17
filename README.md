# Bookshelf Relations


> Auto insert, update and remove nested relationships.

## Installation

    npm install bookshelf-relations --save
    yarn add bookshelf-relations

## Usage

1. Register the plugin.

```
    bookshelf.plugin('bookshelf-relations');
```

2. Define your relationships on each model.

```
    bookshelf.Model.extend({
        relationships: ['tags', 'news']
    }, {...});
```

3. Ensure you call `initialize` of the parent model. This is only required if `autoHook` is set to true.

```
    const proto = bookshelf.Model.prototype;
    
    bookshelf.Model.extend({
        initialize: function() {
            // first register your model events. 
            // otherwise the order of events is different.
            
            // trigger parent
            proto.initialize.call(this);
        }
    });
```
    
## Plugin Options

- `autoHook`: The plugin hooks into your models via bookshelf model events. It adds/updates/deletes the passed relations. So it takes over everything for you. (**default: true**)
- `unsetRelations`: The plugin will unset the relations after they are detected. (**default: true**)
- `hooks.belongsToMany.beforeRelationCreation`: Hook into the process of updating belongsToMany relationships.
- `hooks.belongsToMany.after`: Hook into the process of updating belongsToMany relationships.

## Notes

### Transactions

*It's highly recommended to insert/update/delete your models within [transactions](http://bookshelfjs.org/#Bookshelf-instance-transaction) when using this plugin, because updating nested relationships requires additional queries to the database. Otherwise if an error occurs during any query, you can't expect data to be rolled back fully.*


## Unsupported

The plugin is not able to update nested-nested relations at the moment.
e.g. `.set('tags', [{ name: 'tag1', [relation]: {} }])`. Relation won't get updated.

## Tests

    npm test
    NODE_ENV=testing-mysql npm test
    npm run perf
    npm run coverage

# Copyright & License

Copyright (c) 2017 Ghost Foundation - Released under the [MIT license](LICENSE).
