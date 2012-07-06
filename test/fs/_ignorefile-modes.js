'use strict';

var isArray    = Array.isArray
  , forEach    = require('es5-ext/lib/Object/for-each')
  , isCallable = require('es5-ext/lib/Object/is-callable');

module.exports = function (t, a) {
	forEach(t, function (value, name, index) {
		a.ok(value.filename, "#" + index + " Filename");
		a((value.globalRules == null) || isArray(value.globalRules), true,
			"#" + index + " Global rules");
		a(isCallable(value.findRoot), true, "#" + index + " Find root");
	});
};
