const testUtils = require('../utils');

describe('[Integration] BelongsTo: Posts/Author', function () {
    beforeEach(function () {
        return testUtils.database.reset()
            .then(function () {
                return testUtils.database.init();
            });
    });

    describe('fetch', function () {
        it('fetches the record with specified relations', async function () {
            await testUtils.testPostModel({
                method: 'fetchAll',
                options: {withRelated: ['author']},
                expectSuccess: async (posts) => {
                    posts.length.should.eql(3);
                    posts.models[0].related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[0].author.name);
                    posts.models[1].related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });
    });

    describe('add', function () {
        it('inserts a new author record when provided id is unknown', async function () {
            const currentAuthors = await testUtils.database.getConnection()('authors');
            currentAuthors.length.should.eql(2);

            await testUtils.testPostModel({
                method: 'add',
                values: {
                    title: 'post-title',
                    author: {
                        id: 11111,
                        name: 'test-unknown'
                    }
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql('post-title');
                    result.related('author').toJSON().should.containEql({
                        name: 'test-unknown'
                    });

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(3);
                    authors[0].name.should.eql('Alf');
                    authors[1].name.should.eql('Mozart');
                    authors[2].name.should.eql('test-unknown');
                }
            });
        });
    });

    describe('destroy', function () {
        it('does not remove related authors when the post is removed', async function () {
            await testUtils.testPostModel({
                method: 'destroy',
                id: 2,
                expectSuccess: async (result) => {
                    result.related('author').toJSON().should.eql({});

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });
    });

    describe('edit', function () {
        it('only edits the post', async function () {
            const currentAuthors = await testUtils.database.getConnection()('authors');
            currentAuthors.length.should.eql(2);

            await testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'only-me'
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql('only-me');
                    result.related('author').toJSON()
                        .should.eql(testUtils.fixtures.getAll().posts[1].author);

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });

        it('edits existing post author when id matches', async function () {
            const currentAuthors = await testUtils.database.getConnection()('authors');
            currentAuthors.length.should.eql(2);
            currentAuthors[1].name.should.eql('Mozart');

            await testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    title: 'lala',
                    author: {
                        id: testUtils.fixtures.getAll().posts[1].author.id,
                        name: 'Peter'
                    }
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql('lala');
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name.should.eql('Peter');

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                    authors[0].name.should.eql('Alf');
                    authors[1].name.should.eql('Peter');
                }
            });
        });

        it('edits ONLY existing post "editable" author but NOT the "read-only" newsletter', async function () {
            const post = testUtils.fixtures.getAll().posts[0];
            should.equal(post.author.name, 'Alf');
            should.equal(post.newsletter.title, 'Best newsletter ever');

            await testUtils.testPostModel({
                method: 'edit',
                id: post.id,
                values: {
                    title: 'Changed post title',
                    author: {
                        id: post.author.id,
                        name: 'Peter'
                    },
                    newsletter: {
                        id: post.newsletter.id,
                        title: 'Should NOT change the newsletter title'
                    }
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql('Changed post title');
                    result.related('author').toJSON().id.should.eql(post.author.id);
                    result.related('author').toJSON().name.should.eql('Peter');
                    result.related('newsletter').toJSON().title.should.eql('Best newsletter ever');
                }
            });
        });

        it('inserts a new author record when provided id is unknown', async function () {
            const currentAuthors = await testUtils.database.getConnection()('authors');
            currentAuthors.length.should.eql(2);

            await testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: {
                        id: 20,
                        name: 'Frank'
                    }
                },
                expectSuccess: async (result) => {
                    result.related('author').toJSON().id.should.not.eql(20);
                    result.related('author').toJSON().name.should.eql('Frank');

                    const authors = await testUtils.database
                        .getConnection()('authors');

                    authors.length.should.eql(3);

                    authors[0].name.should.eql('Alf');
                    authors[1].name.should.eql('Mozart');
                    authors[2].name.should.eql('Frank');
                }
            });
        });

        it('overrides existing author and creates a new author db record', async function () {
            const currentAuthors = await testUtils.database.getConnection()('authors');
            currentAuthors.length.should.eql(2);

            await testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: {
                        name: 'Karl'
                    }
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.not.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name.should.eql('Karl');

                    const authors = await testUtils.database
                        .getConnection()('authors');

                    authors.length.should.eql(3);
                    authors[0].name.should.eql('Alf');
                    authors[1].name.should.eql('Mozart');
                    authors[2].name.should.eql('Karl');
                }
            });
        });

        it('does not remove related records when setting the relationship value to null', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,
                values: {
                    author: null
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });

        it('does not remove related records when setting the relationship value to undefined', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 2,

                values: {
                    author: undefined
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[1].title);
                    result.related('author').toJSON().id
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.id);
                    result.related('author').toJSON().name
                        .should.eql(testUtils.fixtures.getAll().posts[1].author.name);

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });

        it('changes related author when a matching id is passed', function () {
            return testUtils.testPostModel({
                method: 'edit',
                id: 1,

                values: {
                    author: {
                        id: testUtils.fixtures.getAll().posts[1].author.id
                    }
                },
                options: {
                    withRelated: ['author']
                },
                expectSuccess: async (result) => {
                    result.get('title').should.eql(testUtils.fixtures.getAll().posts[0].title);
                    result.related('author').toJSON().name.should.eql('Mozart');

                    const authors = await testUtils.database.getConnection()('authors');
                    authors.length.should.eql(2);
                }
            });
        });
    });
});
