module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/test'
    ],
    rules: {
        'ghost/mocha/no-setup-in-describe': 'off'
    }
};
