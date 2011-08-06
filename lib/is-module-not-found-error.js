'use strict';

var k = require('es5-ext/lib/Function/k')

  , token, pattern;

try {
	require(token = ':path:');
} catch (e) {
	pattern = e.message;
}

module.exports = exports = function fn (e, path) {
	return e.message === pattern.replace(token, path);
};

Object.defineProperties(exports, {
	token: { get: k(token) },
	pattern: { get: k(pattern) }
});
