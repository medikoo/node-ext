'use strict';

module.exports = {
	"Same paths": function (t, a) {
		a.equal(t('/a/b/c', '/a/b/c'), '');
	},
	"From deeper than to": function (t, a) {
		a.equal(t('/a/b/c/d/', '/a/b/'), '../../');
	},
	"From deeper than to (file)": function (t, a) {
		a.equal(t('/a/b/c/d/', '/a/b/x'), '../../x');
	},
	"To deeper than from": function (t, a) {
		a.equal(t('/a/b/', '/a/b/c/d/'), 'c/d/');
	},
	"To deeper than from (file)": function (t, a) {
		a.equal(t('/a/b/', '/a/b/c/d/x'), 'c/d/x');
	},
	"Different paths": function (t, a) {
		a.equal(t('/a/b/c/', '/e/f/g/'), '../../../e/f/g/');
	},
	"CWD": function (t, a) {
		a.equal(t(__dirname + '/a/b/'), t(process.cwd(), __dirname + '/a/b/'));
	},
	"Error on relative from": function (t, a) {
		a.throws(function () {
			t('raz/dwa', '/fad/ra/');
		});
	},
	"Error on relative to": function (t, a) {
		a.throws(function () {
			t('/raz/dwa', 'fad/ra/');
		});
	}
};
