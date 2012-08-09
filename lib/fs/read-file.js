'use strict';

var isCallable = require('es5-ext/lib/Object/is-callable')
  , isString   = require('es5-ext/lib/String/is-string')
  , deferred   = require('deferred')
  , native     = require('fs').readFile
  , resolve    = require('path').resolve
  , watch      = require('./watch').watch
  , WatchPath  = require('./watch-path').WatchPath

  , readFile;

readFile = function (filename, options) {
	var def, current, promise, watcher, resolve, onchange, loose;

	def = deferred();
	loose = options.loose;
	native(filename, options.encoding, resolve = function (err, data) {
		if (def.resolved) {
			return;
		}
		if (err) {
			if (watcher && !loose) {
				watcher.close();
			}
			def.resolve(loose ? null : err);
			return;
		}
		if (options.watch) {
			current = String(data);
		}
		def.resolve(data);
	});
	promise = def.promise;

	if (options.watch) {
		onchange = function () {
			native(filename, options.encoding, function (err, data) {
				if (!def.resolved) {
					resolve(err, data);
					return;
				}
				if (!watcher) {
					return;
				}
				if (err) {
					watcher.close();
					promise.emit('end');
					return;
				}
				if (data != current) {
					current = String(data);
					promise.emit('change', data);
				}
			});
		};
		if (loose) {
			current = null;
			watcher = new WatchPath(filename);
			watcher.on('change', function (event) {
				if (event.type === 'remove') {
					if (current != null) {
						promise.emit('change', current = null);
					}
				} else {
					onchange();
				}
			});
		} else {
			try {
				watcher = watch(filename);
			} catch (e) {
				def.resolve(e);
				return promise;
			}
			watcher.on('change', onchange);
			watcher.on('end', function () {
				watcher = null;
				promise.emit('end');
			});
		}
		promise.close = watcher.close;
	}

	return promise;
};
readFile.returnsPromise = true;

module.exports = exports = function (filename) {
	var def, options, cb, promise, watcher, current;

	filename = resolve(String(filename));
	options = arguments[1];
	cb = arguments[2];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	} else {
		options = isString(options) ? { encoding: options } : Object(options);
	}

	return readFile(filename, options).cb(cb);
};
exports.returnsPromise = true;
exports.readFile = readFile;