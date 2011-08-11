// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var fs         = require('fs')
  , path       = require('path')

  , dirExists  = require('./fs/dir-exists')
  , fileExists = require('./fs/file-exists')
	, ptrim      = require('./path/trim')

  , normalize = path.normalize, dirname = path.dirname, stat = fs.stat

  , isPackageRoot;

isPackageRoot = function (pckgpath, callback) {
	fileExists(pckgpath + '/package.json', function (exists) {
		if (exists) {
			callback(null, pckgpath);
			return;
		}
		dirExists(pckgpath + '/node_modules', function (exists) {
			var parentpath;
			if (exists) {
				callback(null, pckgpath);
			} else {
				parentpath = dirname(pckgpath);
				if (parentpath === pckgpath) {
					callback(null, null);
				} else {
					isPackageRoot(parentpath, callback);
				}
			}
		});
	});
};

module.exports = function find (pckgpath, callback) {
	pckgpath = normalize(pckgpath);
	stat(pckgpath, function (err, stats) {
		if (err) {
			find(dirname(pckgpath), callback);
			return;
		}
		if (stats.isDirectory()) {
			isPackageRoot(ptrim(pckgpath), callback);
		} else {
			isPackageRoot(dirname(pckgpath), callback);
		}
	});
};
