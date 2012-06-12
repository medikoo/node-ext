'use strict';

var resolve = require('path').resolve

  , pgPath = resolve(__dirname, '../__playground/dirscan');

module.exports = function (t) {
	var ignoreConf = { filename: '.ignore', isRoot: function (path, cb) {
		cb(path === pgPath);
	} };
	return {
		"Not ignored": function (a, d) {
			t(resolve(pgPath, 'eleven'), { ignoreFiles: [ignoreConf] })(function (r) {
				a(r, false);
			}).end(d);
		},
		"Ignored absolute": function (a, d) {
			t(resolve(pgPath, 'six'), { ignoreFiles: [ignoreConf] })(function (r) {
				a(r, true);
			}).end(d);
		},
		"Ignored relative": function (a, d) {
			t(resolve(pgPath, 'five'), { ignoreFiles: [ignoreConf] })(function (r) {
				a(r, true);
			}).end(d);
		},
		"Ignored by pattern": function (a, d) {
			t(resolve(pgPath, 'nine.foo'),
				{ ignoreFiles: [ignoreConf] })(function (r) {
					a(r, true);
				}).end(d);
		},
		"Excluded": function (a, d) {
			t(resolve(pgPath, 'nine.keep'),
				{ ignoreFiles: [ignoreConf] })(function (r) {
					a(r, false);
				}).end(d);
		},
		"Ignored deep": function (a, d) {
			t(resolve(pgPath, 'one/five'),
				{ ignoreFiles: [ignoreConf] })(function (r) {
					a(r, true);
				}).end(d);
		},
		"Not ignored deep": function (a, d) {
			t(resolve(pgPath, 'one/ten'),
				{ ignoreFiles: [ignoreConf] })(function (r) {
					a(r, false);
				}).end(d);
		},
		"ignored in deep": function (a, d) {
			t(resolve(pgPath, 'one/seven'),
				{ ignoreFiles: [ignoreConf] })(function (r) {
					a(r, true);
				}).end(d);
		},
		"Two files: override to exclude": function (a, d) {
			t(resolve(pgPath, 'nine.keep'),
				{ ignoreFiles: [ignoreConf], git: true })(function (r) {
					a(r, false);
				}).end(d);
		},
		"Two files: ignore in first": function (a, d) {
			t(resolve(pgPath, 'one/eleven'),
				{ ignoreFiles: [ignoreConf], git: true })(function (r) {
					a(r, true);
				}).end(d);
		}
	}
};
