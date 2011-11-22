// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var fs         = require('fs')
  , path       = require('path')
  , contains   = require('es5-ext/lib/Array/prototype/contains')

  , dirExists  = require('./fs/dir-exists')
  , fileExists = require('./fs/file-exists')
	, ptrim      = require('./path/trim')

  , normalize = path.normalize, dirname = path.dirname, stat = fs.stat

  , isPackageRoot, cache = [];

cache.contains = contains;

isPackageRoot = function (path, callback) {
	if (cache.contains(path)) {
		callback(null, path);
		return;
	}
	fileExists(path + '/package.json', function (exists) {
		if (exists) {
			cache.push(path);
			callback(null, path);
			return;
		}
		dirExists(path + '/node_modules', function (exists) {
			var parentpath;
			if (exists) {
				cache.push(path);
				callback(null, path);
			} else {
				parentpath = dirname(path);
				if (parentpath === path) {
					callback(null, null);
				} else if (parentpath.slice(parentpath.lastIndexOf('/') + 1)
					=== 'node_modules') {
					cache.push(path);
					callback(null, path);
				} else {
					isPackageRoot(parentpath, callback);
				}
			}
		});
	});
};

module.exports = function find (path, callback) {
	path = normalize(path);
	stat(path, function (err, stats) {
		if (err) {
			find(dirname(path), callback);
			return;
		}
		if (stats.isDirectory()) {
			isPackageRoot(ptrim(path), callback);
		} else {
			isPackageRoot(dirname(path), callback);
		}
	});
};
