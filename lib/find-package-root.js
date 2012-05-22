// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var path       = require('path')
  , valid      = require('es5-ext/lib/valid-value')
  , memoize    = require('es5-ext/lib/Function/memoize')
  , promisify  = require('deferred').promisify
  , stat       = promisify(require('fs').stat)
  , dirExists  = promisify(require('./fs/dir-exists'))
  , fileExists = promisify(require('./fs/file-exists'))

  , basename = path.basename, dirname = path.dirname, resolve = path.resolve

  , isRoot, find;

isRoot = memoize(function (path) {
	return fileExists(resolve(path, 'package.json'))(function (exists) {
		return exists ? path : dirExists(resolve(path, 'node_modules'))(
			function (exists) {
				var parent;
				if (exists) {
					return path;
				} else {
					parent = dirname(path);
					if (parent === path) {
						return null;
					} else if (basename(parent) === 'node_modules') {
						return path;
					} else {
						return isRoot(parent);
					}
				}
			}
		);
	});
});

find = memoize(function (path) {
	return stat(path)(function (stats) {
		return isRoot(stats.isDirectory() ? path : dirname(path));
	}, function () {
		return isRoot(dirname(path));
	});
}, [function (path) {
	return valid(path) && resolve(String(path));
}]);

module.exports = function (path, callback) {
	try {
		return find(path).cb(callback);
	} catch (e) {
		callback(e);
	}
};
