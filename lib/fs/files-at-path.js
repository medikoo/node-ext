// Get all files at path

'use strict';

var stat    = require('fs').stat
  , readdir = require('./readdir-files-deep');

module.exports = function (path, cb) {
	stat(path, function (err, stats) {
		if (err) {
			cb(err);
			return;
		}
		if (stats.isFile()) {
			cb(null, [path]);
		} else if (stats.isDirectory()) {
			readdir(path, cb);
		} else {
			cb(null, []);
		}
	});
};
