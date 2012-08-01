// For given path returns root package path.
// If given path doesn't point to package content then null is returned.

'use strict';

var path       = require('path')
  , memoize    = require('es5-ext/lib/Function/prototype/memoize')
  , value      = require('es5-ext/lib/Object/valid-value')
  , promisify  = require('deferred').promisify
  , stat       = promisify(require('fs').stat)

  , basename = path.basename, dirname = path.dirname, resolve = path.resolve

  , isRoot, find;

isRoot = memoize.call(function (path) {
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
					return isRoot(parent);
				}
			}
		});
	});
});

find = memoize.call(function (path) {
	return stat(path)(function (stats) {
		return isRoot(stats.isDirectory() ? path : dirname(path));
	}, function () {
		return isRoot(dirname(path));
	});
}, { resolvers: [function (path) {
	return resolve(String(value(path)));
}] });

module.exports = function (path, callback) {
	try {
		return find(path).cb(callback);
	} catch (e) {
		process.nextTick(function () {
			callback(e);
		});
	}
};
