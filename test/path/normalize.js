'use strict';

var sep = require('../../lib/path/sep');

module.exports = function (t, a) {
	a(t('a/b/c/'), ['a', 'b', 'c'].join(sep), "Trailing slash");
	a(t('a/b/c'), ['a', 'b', 'c'].join(sep), "No trailing slash");
	a(t('a/b/../c'), ['a', 'c'].join(sep), "Resolve");
	a(t('a/b/./././c'), ['a', 'b', 'c'].join(sep), "Resolve #2");
	a(t('/'), sep, "Root");
	a(t(''), '', "Empty");
};
