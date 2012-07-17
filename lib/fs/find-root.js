'use strict';

var path     = require('path')
  , memoize  = require('es5-ext/lib/Function/prototype/memoize')
  , callable = require('es5-ext/lib/Object/valid-callable')
  , deferred = require('deferred')
  , ee       = require('event-emitter')

  , resolve = path.resolve, dirname = path.dirname;

var findRoot = memoize.call(function (isRoot, path) {
	var listeners = {}, onvalue, onevent, def, promise, known;

	def = deferred();
	promise = ee(def.promise);

	onvalue = function (value) {
		var dir;
		if (known) {
			return false;
		}
		isRoot(this).on('change', listeners[this] = onevent);
		if (value) {
			known = true;
			return this;
		}
		dir = dirname(this);
		if (dir != this) {
			return isRoot(dir)(onvalue.bind(dir));
		} else {
			known = true;
			return null;
		}
	};

	onevent = function (value, path) {
		var dir;
		if (!value) {
			dir = dirname(path);
			if (dir !== path) {
				known = false;
				isRoot(dir)(onvalue.bind(dir)).end(function (path) {
					if (path === false) {
						return;
					}
					promise.value = path;
					promise.emit('change', path);
				}, null);
			} else {
				promise.value = null;
				promise.emit('change', null);
			}
		} else {
			known = true;
			dir = dirname(path);
			while (listeners[dir]) {
				isRoot(dir).off('change', onevent);
				delete listeners[dir];
				dir = dirname(dir);
			}
			if (promise.value !== path) {
				promise.value = path;
				promise.emit('change', path);
			}
		}
	};

	def.resolve(isRoot(path)(onvalue.bind(path)));
	return promise;
});

module.exports = function (isRoot, path) {
	return findRoot(callable(isRoot),
		dirname(resolve(String(path)))).cb(arguments[2]);
};
