// This file is required before any test is run

// Taken from the should wiki, this is how to make should global
// Should is shared globally by the test bootstrap.
global.should = require('should').noConflict();
should.extend();

// Sinon is a simple case
// Sinon is shared globally by the test bootstrap.
global.sinon = require('sinon');
