'use strict';

var create         = Object.create
  , remove         = require('es5-ext/lib/Array/prototype/remove')
  , resolve        = require('path').resolve
  , watchReg       = require('./_watch')
  , watchAlt       = require('./_watch-alt')
  , memoizeWatcher = require('./_memoize-watcher')

  , watch, watchers, limit, compare, switchToAlt, switchToReg
  , onLstat;

if (process.platform === 'darwin') {
	// OSX has crazy limit of 250 descriptors per process
	// When we reach that limit we also block all other file operations
	// e.g. readFile or readdir.
	// We workaround that by allowing only 120 constant watches and then
	// using alternative that's based on lstat pinging
	// Additionally we make sure that files on which larger number of updates is
	// generated are handled by regular watch

	watchers = [];
	limit = 120;

	compare = function (a, b) {
		return b.count - a.count;
	};

	switchToAlt = function (watcher) {
		var closePrevious = watcher.emitter._close;
		try {
			watchAlt(watcher.path, watcher.emitter);
		} catch (e) {
			watcher.emitter.end();
			return;
		}
		closePrevious();
		watcher.alt = true;
		onLstat(watcher);
	};

	switchToReg = function (watcher) {
		var emitter = watcher.emitter
		  , closePrevious = emitter._close;

		emitter.off('change', emitter._watchSwitchListener);
		delete emitter._watchSwitchListener;

		try {
			watchReg(watcher.path, watcher.emitter);
		} catch (e) {
			watcher.emitter.end();
			return;
		}
		closePrevious();
		watcher.alt = false;
	};

	onLstat = function (watcher) {
		var emitter = watcher.emitter;
		emitter.on('change', emitter._watchSwitchListener = function () {
			var index, close, switchCandidate;
			watchers.sort(compare);
			index = watchers.indexOf(watcher);
			if (index < limit) {
				// Move last regular watcher to lstat watch
				switchToAlt(watchers[limit]);

				// Move current watcher to regular watch
				switchToReg(watcher);
			}
		});
	};

	watch = function (path) {
		var emitter, watcher;
		watcher = { path: path, count: 0 }
		if (watchers.length >= limit) {
			emitter = watcher.emitter = watchAlt(path);
			watcher.alt = true;
		} else {
			emitter = watcher.emitter = watchReg(path);
		}
		watchers.push(watcher);
		emitter._close = emitter.close;
		emitter.close = function () {
			var last;
			emitter._close();
			remove.call(watchers, watcher);
			watch.clear(path);
			if (!watcher.alt && (watchers.length >= limit)) {
				last = watchers[limit - 1];
				if (last.alt) {
					switchToReg(last);
				}
			}
		};
		emitter.on('end', function () {
			emitter.close();
		});
		emitter.on('change', function () {
			++watcher.count;
		});
		if (watcher.alt) {
			onLstat(watcher);
		}
		return emitter;
	};
} else {
	watch = function (path) {
		var emitter = watchReg(path);
		emitter.on('end', function () {
			watch.clear(path);
		});
		return emitter;
	};
}
watch = memoizeWatcher(watch, { primitive: true });

module.exports = exports = function (path) {
	return watch(resolve(String(path)));
};
exports.watch = watch;
