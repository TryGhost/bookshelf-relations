/**
 * Test Utilities
 *
 * Shared utils for writing tests
 */

// Require overrides - these add globals for tests
require('./overrides');

// Require assertions - adds custom should assertions
require('./assertions');

// Custom utilities
module.exports = require('./db');
module.exports.testPostModel = require('./test_post_model');
