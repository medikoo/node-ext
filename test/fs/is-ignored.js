'use strict';

var resolve = require('path').resolve

  , pgPath = resolve(__dirname, '../__playground/dirscan');

module.exports = function (t) {
	return {
		"Not ignored": function (a, d) {
			t(resolve(pgPath, 'eleven'), '.ignore')(function (r) {
				a(r, false);
			}).end(d);
		},
		"Ignored absolute": function (a, d) {
			t(resolve(pgPath, 'six'), '.ignore')(function (r) {
				a(r, true);
			}).end(d);
		},
		"Ignored relative": function (a, d) {
			t(resolve(pgPath, 'five'), '.ignore')(function (r) {
				a(r, true);
			}).end(d);
		},
		"Ignored by pattern": function (a, d) {
			t(resolve(pgPath, 'nine.foo'), '.ignore')(function (r) {
				a(r, true);
			}).end(d);
		},
		"Excluded": function (a, d) {
			t(resolve(pgPath, 'nine.keep'), '.ignore')(function (r) {
				a(r, false);
			}).end(d);
		},
		"Ignored deep": function (a, d) {
			t(resolve(pgPath, 'one/five'), '.ignore')(function (r) {
				a(r, true);
			}).end(d);
		},
		"Not ignored deep": function (a, d) {
			t(resolve(pgPath, 'one/ten'), '.ignore')(function (r) {
				a(r, false);
			}).end(d);
		},
		"ignored in deep": function (a, d) {
			t(resolve(pgPath, 'one/seven'), '.ignore')(function (r) {
				a(r, true);
			}).end(d);
		},
		"Two files: override to exclude": function (a, d) {
			t(resolve(pgPath, 'nine.keep'), ['.gitignore', '.ignore'])(function (r) {
				a(r, false);
			}).end(d);
		},
		"Two files: override to ignore": function (a, d) {
			t(resolve(pgPath, 'nine.keep'), ['.ignore', '.gitignore'])(function (r) {
				a(r, true);
			}).end(d);
		},
		"Two files: ignore in first": function (a, d) {
			t(resolve(pgPath, 'one/eleven'), ['.gitignore', '.ignore'])(function (r) {
				a(r, true);
			}).end(d);
		}
	}
};
