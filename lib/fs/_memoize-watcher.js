'use strict';

var noop    = require('es5-ext/lib/Function/noop')
  , extend  = require('es5-ext/lib/Object/extend')
  , memoize = require('memoizee')
  , ee      = require('event-emitter')

module.exports = function (fn/*, options*/) {
	var factory, memoized;
	memoized = memoize(fn, extend(Object(arguments[1]), { gc: true }));
	factory = function () {
		var watcher, emitter, pipe, args;
		args = arguments;
		watcher = memoized.apply(this, arguments);
		emitter = ee();
		pipe = ee.pipe(watcher, emitter);
		emitter.close = function () {
			emitter.close = noop;
			pipe.close();
			if (memoized.clearRef.apply(this, args)) {
				watcher.close();
			}
		};
		return emitter;
	};
	factory.clear = memoized.clear;
	return factory;
};
