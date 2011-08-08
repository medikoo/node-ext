// Require module, if module is not found return null, if there was an error
// while compiling module, then return error that was thrown.

'use strict';

var bbind      = require('es5-ext/lib/Function/bind-bind')
  , isNotFound = require('./is-module-not-found-error')
  , startsWith = require('es5-ext/lib/String/starts-with');

module.exports = bbind(function (path) {
	try {
		return this.apply(null, arguments);
	} catch (e) {
		return isNotFound(e, path) ? null : e;
	}
});
