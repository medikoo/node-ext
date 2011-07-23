'use strict';

var path = require('path')
  , fpath = __dirname + '/__playground/sample.js'
  , o = require('./__playground/sample');

module.exports = {
	"File path": function (t, a, d) {
		t(fpath, function (err, r) {
			if (err) {
				a.fail(err); d();
				return;
			}
			a(r('./sample'), o); d();
		});
	},
	"Dir path": function (t, a, d) {
		t(path.dirname(fpath), function (err, r) {
			if (err) {
				a.fail(err); d();
				return;
			}
			a(r('./sample'), o); d();
		});
	}
};
