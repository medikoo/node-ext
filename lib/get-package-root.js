// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var fs              = require('fs')
  , path            = require('path')

  , dirExists = require('./fs/dir-exists')
  , fileExists      = require('./fs/file-exists')

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
				parentpath = path.dirname(pckgpath);
				if (parentpath === pckgpath) {
					callback(null, null);
				} else {
					isPackageRoot(parentpath, callback);
				}
			}
		});
	});
};

module.exports = function (pckgpath, callback) {
	pckgpath = path.normalize(pckgpath);
	fs.stat(pckgpath, function (err, stats) {
		if (err) {
			callback(err);
			return;
		}
		if (stats.isDirectory()) {
			if ((pckgpath.slice(-1) === '/') && (pckgpath.length > 1)) {
				pckgpath = pckgpath.slice(0, -1);
			}
			isPackageRoot(pckgpath, callback);
		} else {
			isPackageRoot(path.dirname(pckgpath), callback);
		}
	});
};
