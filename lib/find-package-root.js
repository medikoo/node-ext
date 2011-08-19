// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var fs         = require('fs')
  , path       = require('path')
  , contains   = require('es5-ext/lib/List/contains')

  , dirExists  = require('./fs/dir-exists')
  , fileExists = require('./fs/file-exists')
	, ptrim      = require('./path/trim')

  , normalize = path.normalize, dirname = path.dirname, stat = fs.stat

  , isPackageRoot, cache = [];

cache.contains = contains;

isPackageRoot = function (pckgpath, callback) {
	if (cache.contains(pckgpath)) {
		callback(null, pckgpath);
		return;
	}
	fileExists(pckgpath + '/package.json', function (exists) {
		if (exists) {
			cache.push(pckgpath);
			callback(null, pckgpath);
			return;
		}
		dirExists(pckgpath + '/node_modules', function (exists) {
			var parentpath;
			if (exists) {
				cache.push(pckgpath);
				callback(null, pckgpath);
			} else {
				parentpath = dirname(pckgpath);
				if (parentpath === pckgpath) {
					callback(null, null);
				} else if (parentpath.slice(parentpath.lastIndexOf('/') + 1)
					=== 'node_modules') {
					cache.push(pckgpath);
					callback(null, pckgpath);
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
