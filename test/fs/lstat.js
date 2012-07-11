'use strict';

var keys  = Object.keys
  , lstat = require('fs').lstat

module.exports = function (t, a, d) {
	var our = t(__filename);
	lstat(__filename, function (err, lstat) {
		a(our, t(__filename), "Cached");
		our(function (our) {
			a.deep(keys(our), keys(lstat), "Result");
		}).end(d);
	});
};
