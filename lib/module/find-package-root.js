// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var value      = require('es5-ext/lib/Object/valid-value')
  , promisify  = require('deferred').promisify
  , memoize    = require('memoizee')
  , path       = require('path')
  , stat       = promisify(require('fs').stat)

  , basename = path.basename, dirname = path.dirname, resolve = path.resolve

  , findRoot;

findRoot = memoize(function (path) {
	return stat(resolve(path, 'package.json'))(function (stats) {
		return stats.isFile();
	}, false)(function (exists) {
		return exists ? path : stat(resolve(path, 'node_modules'))(
			function (stats) {
				return stats.isDirectory();
			}, false
		)(function (exists) {
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
					return findRoot(parent);
				}
			}
		});
	});
});
findRoot.returnsPromise;

module.exports = exports = function (path, cb) {
	return findRoot(dirname(resolve(String(path)))).cb(cb);
};
exports.returnsPromise;
exports.findRoot = findRoot;
