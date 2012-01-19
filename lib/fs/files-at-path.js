// Get all files at path

'use strict';

var stat    = require('fs').lstat
  , ptrim   = require('../path/trim')
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
			readdir(path, function (err, files) {
				if (err) {
					cb(err);
					return;
				}
				path = ptrim(path);
				cb(null, files.map(function (file) {
					return path + '/' + file;
				}));
			});
		} else {
			cb(null, []);
		}
	});
};