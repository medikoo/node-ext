// Read all filenames from directory and it's subdirectories

'use strict';

var readdir   = require('fs').readdir
  , normalize = require('../path/normalize')

  , read;

read = function (path, files, cb) {
	var waiting = files.length, result = [];
	if (!waiting) {
		cb(null, result);
		return;
	}
	files.forEach(function (file) {
		readdir(path + '/' + file, function (err, files) {
			if (err) {
				switch (err.code) {
				case "UNKNOWN":
				case "ENOTDIR":
					result.push(file);
				}
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
