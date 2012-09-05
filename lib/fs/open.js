'use strict';

var isCallable  = require('es5-ext/lib/Object/is-callable')
  , deferred    = require('deferred')
  , original    = require('fs').open
  , resolve     = require('path').resolve
  , descLimiter = require('./_descriptor-limiter')

  , _open, open, descriptors = [];

_open = function (path, flags, mode) {
	var def = this;

	descLimiter.open();
	original(path, flags, mode, function (err, fd) {
		if (err) {
			descLimiter.close();
			def.resolve(err);
			return;
		}
		descriptors.push(fd);
		def.resolve(fd);
	});
};

open = function (path, flags, mode) {
	var def = deferred(), sync = true;
	descLimiter(function () {
		if (sync) {
			_open.call(def, path, flags, mode);
		} else {
			try {
				_open.call(def, path, flags, mode);
			} catch (e) {
				def.resolve(e);
			}
		}
	});
	sync = false;
	return def.promise;
};
open.returnsPromise = true;

module.exports = exports = function (path, flags, mode, callback) {
	path = resolve(String(path));
	flags = String(flags);

	if ((callback == null) && isCallable(mode)) {
		callback = mode;
		mode = null;
	}

	return open(path, flags, mode).cb(callback);
};
exports.returnsPromise = true;
exports.open = open;
exports._openDescriptors = [];
