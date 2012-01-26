// Read all filenames from directory and it's subdirectories

'use strict';

var fs        = require('fs')
  , normalize = require('../path/normalize')
  , readdir = fs.readdir, lstat = fs.lstat

  , read;

read = function (path, files, cb) {
	var waiting = files.length, result = [];
	if (!waiting) {
		cb(null, result);
		return;
	}
	files.forEach(function (file) {
		lstat(path + '/' + file, function (err, stat) {
			if (err) {
				if (!--waiting) {
					cb(null, result);
				}
			} else if (stat.isFile()) {
				result.push(file);
				if (!--waiting) {
					cb(null, result);
				}
			} else if (stat.isDirectory()) {
				readdir(path + '/' + file, function (err, files) {
					if (err) {
						if (!--waiting) {
							cb(null, result);
						}
					} else {
						read(path + '/' + file, files, function (err, res) {
							result = result.concat(res.map(function (name) {
								return normalize(file + '/' + name);
							}));
							if (!--waiting) {
								cb(null, result);
							}
						});
					}
				});
			} else if (!--waiting) {
				cb(null, result);
			}
		});
	});
};

module.exports = function self (path, cb) {
	readdir(path = normalize(path), function (err, files) {
		if (err) {
			cb(err);
			return;
		}
		read(path, files, cb);
	});
};
