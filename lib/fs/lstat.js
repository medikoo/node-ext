'use strict';

var orgLstat = require('deferred').promisify(require('fs').lstat)
  , resolve  = require('path').resolve
  , memoize  = require('es5-ext/lib/Function/prototype/memoize')
  , watch    = require('./watch')

  , lstat;

lstat = memoize.call(function (path) {
	var result, watcher, listener;
	result = orgLstat(path);
	try {
		watcher = watch(path);
	} catch (e) {
		lstat.preventCache = true;
	}
	if (watcher) {
		watcher.once('change', function () {
			listener();
			watcher.off('end', listener);
		});
		watcher.on('end', listener = function () {
			lstat.clearCache(path);
		});
	}
	return result;
});

module.exports = function (path) {
	return lstat(resolve(String(path))).cb(arguments[1]);
};
