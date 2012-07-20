'use strict';

var isArray    = Array.isArray
  , forEach    = require('es5-ext/lib/Object/for-each')
  , isCallable = require('es5-ext/lib/Object/is-callable');

module.exports = function (t, a) {
	forEach(t, function (value, name) {
		a.ok(value.filename, "#" + name + " Filename");
		a((value.globalRules == null) || isArray(value.globalRules), true,
			"#" + name + " Global rules");
		a(isCallable(value.findRoot), true, "#" + name + " Find root");
		a(isCallable(value.findRootWatch), true, "#" + name + " Find root (watch)");
	});
};
