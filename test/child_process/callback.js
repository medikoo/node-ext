'use strict';

var path  = require('path')
  , spawn = require('child_process').spawn
  , pg = path.dirname(__dirname) + '/__playground';

module.exports = {
	"Ok": function (t, a, d) {
		t(pg + '/process-ok.js', function (err, res) {
			a(err, null, "Error");
			a(res.out, "OK", "Stdout");
			a(res.err, "ERROR", "Stderr"); d();
		});
	},
	"Error": function (t, a, d) {
		t(pg + '/process-error.js', function (err, res) {
			a.ok(err instanceof Error, "Error");
			a.not(err.code, 0, "Code"); d();
		});
	}
};
