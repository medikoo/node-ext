'use strict';

var path  = require('path')
  , spawn = require('child_process').spawn
  , pg = path.dirname(__dirname) + '/__playground';

module.exports = {
	"Ok": function (t, a, d) {
		t(pg + '/process-ok.js', function (err, res) {
			a(err, null, "Error");
			a(res, "OK", "Result"); d();
		});
	},
	"Error": function (t, a, d) {
		t(pg + '/process-error.js', function (err, res) {
			a.ok(err instanceof Error, "Error");
			a(err.message, 'ERROR', "Message");
			a(err.stdout, 'OUT', "Stdout");
			a(err.code, 0, "Code"); d();
		});
	}
};
