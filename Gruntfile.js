module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        release: {
            options: {
                changelog: true
            },
            github: {
                repo: 'TryGhost/bookshelf-relations',
                accessTokenVar: 'GITHUB_ACCESS_TOKEN'
            }
        }
    });

    grunt.loadNpmTasks('grunt-release');
};