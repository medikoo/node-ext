'use strict';

var watch    = require('fs').watch
  , path     = require('path')
  , memoize  = require('es5-ext/lib/Function/prototype/memoize')
  , callable = require('es5-ext/lib/Object/valid-callable')

  , resolve = path.resolve, exists = path.exists;

var watchPath = memoize.call(function (filename) {
	return watch(filename, { persistent: false }, function (type) {
		if (type === 'rename') {
			exists(filename, function (exists) {
				if (!exists) {
					watchPath.clearCache(filename);
				}
			});
		}
	});
});

module.exports = function (filename, listener) {
	callable(listener);
	watchPath(resolve(String(filename))).once('change', listener);
};
