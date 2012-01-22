// Get all files at path

'use strict';

var stat      = require('fs').lstat
  , normalize = require('../path/normalize')
  , readdir   = require('./readdir-files-deep')

module.exports = function (path, cb) {
	path = normalize(path);
	stat(path, function (err, stats) {
		if (err) {
			cb(err);
			return;
		}
		if (stats.isFile()) {
			cb(null, [path]);
		} else if (stats.isDirectory()) {
			readdir(path, function (err, files) {
				if (err) {
					cb(err);
					return;
				}
				cb(null, files.map(function (file) {
					return normalize(path + '/' + file);
				}));
			});
		} else {
			cb(null, []);
		}
	});
};
