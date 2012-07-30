'use strict';

var create   = Object.create
  , remove   = require('es5-ext/lib/Array/prototype/remove')
  , noop     = require('es5-ext/lib/Function/noop')
  , memoize  = require('es5-ext/lib/Function/prototype/memoize')
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
	// Additionally we make sure that those with larger number of updates
	// are handled by regular watch

	watchers = [];
	limit = 120;

	compare = function (a, b) {
		return b.count - a.count;
	};

	switchToAlt = function (watcher) {
		var close = watcher.emitter._close;
		try {
			watchAlt(watcher.path, watcher.emitter);
		} catch (e) {
			watcher.emitter.close();
			return;
		}
		close();
		watcher.alt = true;
		onLstat(watcher);
	};

	switchToReg = function (watcher) {
		var close = watcher.emitter._close;
		try {
			watchReg(watcher.path, watcher.emitter);
		} catch (e) {
			watcher.emitter.close();
			return;
		}
		close();
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

	watch = memoize.call(function (path) {
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
			watch.clearCache(path);
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
		emitter.count = 0;
		return emitter;
	});
} else {
	watch = memoize.call(function (path) {
		var emitter = watchReg(path);
		emitter.on('end', function () {
			watch.clearCache(path);
		});
		emitter.count = 0;
		return emitter;
	});
}

module.exports = exports = function (path) {
	var proto, watcher, onchange, onend;
	path = resolve(String(path));
	proto = watch(path);
	++proto.count;
	watcher = create(proto);
	proto.on('change', onchange = function (event) {
		watcher.emit('change', event);
	});
	proto.on('end', onend = function () {
		watcher.emit('end');
		watcher.allOff();
	});
	watcher.close = function () {
		watcher.close = noop;
		watcher.allOff();
		if (!--proto.count) {
			proto.allOff();
			proto._close();
			watch.clearCache(path);
		} else {
			proto.off('change', onchange);
			proto.off('end', onend);
		}
	};
	return watcher;
};
exports.watch = watch;
