'use strict';

var resolve   = require('path').resolve
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , promisify = require('deferred').promisify
  , lstat     = promisify(require('fs').lstat)
  , watch     = require('./watch-path');

var isRoot = memoize.call(function (path) {
	var watcher, promise, gPath;

	gPath = resolve(path, '.git');
	promise = lstat(gPath)(function (stat) {
		return stat.isDirectory();
	}, false);
	watch(gPath).on('change', function (event) {
		if (event.type === 'create') {
			promise.value = true;
		} else if (event.type == 'remove') {
			promise.value = false;
		} else {
			return;
		}
		promise.emit('change', promise.value, path);
	});

	return promise;
});

module.exports = function (path) {
	return isRoot(resolve(String(path))).cb(arguments[1]);
};
