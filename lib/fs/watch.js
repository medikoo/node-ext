'use strict';

var create   = Object.create
  , remove   = require('es5-ext/lib/Array/prototype/remove')
  , invoke   = require('es5-ext/lib/Function/invoke')
  , noop     = require('es5-ext/lib/Function/noop')
  , lock     = require('es5-ext/lib/Function/prototype/lock')
  , memoize  = require('memoizee')
  , ee       = require('event-emitter')
  , resolve  = require('path').resolve
  , watchReg = require('./_watch')
  , watchAlt = require('./_watch-alt')

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
		var closePrevious = watcher.emitter.close;
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
		var closePrevious = watcher.emitter.close;
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
		emitter.on('change', function listener() {
			var index, close, switchCandidate;
			watchers.sort(compare);
			index = watchers.indexOf(watcher);
			if (index < limit) {
				// Move last regular watcher to lstat watch
				switchToAlt(watchers[limit]);

				// Move current watcher to regular watch
				switchToReg(watcher);

				emitter.off('change', listener);
			}
		});
	};

	watch = memoize(function (path) {
		var emitter, watcher;
		watcher = { path: path, count: 0 }
		if (watchers.length >= limit) {
			emitter = watcher.emitter = watchAlt(path);
			watcher.alt = true;
		} else {
			emitter = watcher.emitter = watchReg(path);
		}
		watchers.push(watcher);
		emitter.on('end', function () {
			var last;
			watch.clear(path);
			remove.call(watchers, watcher);
			if (!watcher.alt && (watchers.length >= limit)) {
				last = watchers[limit - 1];
				if (last.alt) {
					switchToReg(last);
				}
			}
		});
		emitter.on('change', function () {
			++watcher.count;
		});
		if (watcher.alt) {
			onLstat(watcher);
		}
		return emitter;
	}, { primitive: true, gc: true, ongcclear: invoke('close') });
} else {
	watch = memoize(function (path) {
		var emitter = watchReg(path);
		emitter.on('end', function () {
			watch.clear(path);
		});
		return emitter;
	}, { primitive: true, gc: true, ongcclear: invoke('close') });
}

module.exports = exports = function (path) {
	var watcher, emitter;
	path = resolve(String(path));
	watcher = watch(path);
	emitter = ee();
	ee.pipe(watcher, emitter);
	emitter.close = lock.call(watch.clearRef, path);
	return emitter;
};
exports.watch = watch;
