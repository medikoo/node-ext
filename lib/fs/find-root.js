'use strict';

var path     = require('path')
  , memoize  = require('es5-ext/lib/Function/prototype/memoize')
  , callable = require('es5-ext/lib/Object/valid-callable')
  , deferred = require('deferred')
  , ee       = require('event-emitter')

  , resolve = path.resolve, dirname = path.dirname;

var findRoot = memoize.call(function (isRoot, path) {
	var listeners = {}, onvalue, onevent, deferral, promise;

	deferral = deferred();
	promise = ee(deferral.promise);

	onvalue = function (value) {
		var dir;
		isRoot(this).on('change', listeners[this] = onevent);
		if (value) {
			return this;
		}
		dir = dirname(this);
		if (dir != this) {
			return isRoot(dir)(onvalue.bind(dir));
		} else {
			return null;
		}
	};

	onevent = function (value, path) {
		var dir;
		if (!value) {
			dir = dirname(path);
			if (dir !== path) {
				isRoot(dir)(onvalue.bind(dir)).end(function (path) {
					promise._base.value = path;
					promise.emit('change', path);
				}, null);
			} else {
					promise._base.value = null;
				promise.emit('change', null);
			}
		} else {
			dir = dirname(path);
			while (listeners[dir]) {
				isRoot(dir).off('change', onevent);
				delete listeners[dir];
				dir = dirname(dir);
			}
			promise._base.value = path;
			promise.emit('change', path);
		}
	};

	deferral.resolve(isRoot(path)(onvalue.bind(path)));
	return promise;
});

module.exports = function (isRoot, path) {
	return findRoot(callable(isRoot),
		dirname(resolve(String(path)))).cb(arguments[2]);
};
