'use strict';

var bbind      = require('es5-ext/lib/Function/bind-bind')
  , startsWith = require('es5-ext/lib/String/starts-with');

module.exports = bbind(function (path) {
	try {
		return this(path);
	} catch (e) {
		return startsWith(e.message, "Cannot find module '" + path) ? null : e;
	}
});
