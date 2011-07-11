'use strict';

var path = require('path')

  , pgPath, upPath, t;

pgPath = __dirname + '/__playground';
upPath = path.dirname(path.dirname(__dirname));

module.exports = {
	"Detect by package.json": function (t, a, d) {
		t(pgPath + '/package/one/two/', function (err, path) {
			a.equal(path, pgPath + '/package'); d();
		});
	},
	"Detect by node_modules": function (t, a, d) {
		t(pgPath + '/package2/one/two/samplefile', function (err, path) {
			a.equal(path, pgPath + '/package2'); d();
		});
	},
	"No package path": function (t, a, d) {
		t('/', function (err, path) {
			a.equal(path, null); d();
		});
	},
	"Wrong path": function (t, a, d) {
		t(pgPath + '/abc/cdf', function (err, path) {
			a.throws(function () { throw err; }, false); d();
		});
	}
};
