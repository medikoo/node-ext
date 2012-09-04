'use strict';

var create         = Object.create
  , last           = require('es5-ext/lib/Array/prototype/last')
  , remove         = require('es5-ext/lib/Array/prototype/remove')
  , partial        = require('es5-ext/lib/Function/prototype/partial')
  , resolve        = require('path').resolve
  , watchReg       = require('./_watch')
  , watchAlt       = require('./_watch-alt')
  , isAvail        = partial.call(
		require('./_descriptor-limiter').isAvailable, 50)
  , memoizeWatcher = require('./_memoize-watcher')

  , watch, watchers, compare, switchToAlt, switchToReg
  , switchAltsToReg, onLstat;

watchers = { reg: [], alt: [] };

compare = function (a, b) {
	return b.count - a.count;
};

switchToAlt = function (watcher) {
	var closePrevious = watcher.emitter._close;
	remove.call(watchers.reg, watcher);
	try {
		watchAlt(watcher.path, watcher.emitter);
	} catch (e) {
		watcher.emitter.end();
		return;
	}
	closePrevious();
	watcher.alt = true;
	onLstat(watcher);
	watchers.alt.push(watcher);
	watchers.alt.sort(compare);
};

switchToReg = function (watcher) {
	var emitter = watcher.emitter
	  , closePrevious = emitter._close;

	emitter.off('change', emitter._watchSwitchListener);
	delete emitter._watchSwitchListener;

	remove.call(watchers.alt, watcher);
	try {
		watchReg(watcher.path, watcher.emitter);
	} catch (e) {
		watcher.emitter.end();
		return;
	}
	closePrevious();
	watcher.alt = false;
	watchers.reg.push(watcher);
	watchers.reg.sort(compare);
};

switchAltsToReg = function () {
	while (watchers.alt.length && isAvail()) {
		switchToReg(watchers.alt[0]);
	}
};

onLstat = function (watcher) {
	var emitter = watcher.emitter;
	emitter.on('change', emitter._watchSwitchListener = function () {
		var candidate;
		watchers.alt.sort(compare);
		if (watchers.alt[0] !== watcher) return;

		if (isAvail()) {
			switchAltsToReg();
		} else if (watchers.reg.length) {
			candidate = last.call(watchers.reg);
			if (candidate.count >= watcher.count) return;

			// Move last regular watcher to lstat watch
			switchToAlt(candidate);

			// Move current watcher to regular watch
			switchToReg(watcher);
		}
	});
};

watch = memoizeWatcher(function (path) {
	var emitter, watcher;
	watcher = { path: path, count: 0 };
	if (isAvail()) {
		emitter = watcher.emitter = watchReg(path);
		watchers.reg.push(watcher);
	} else {
		emitter = watcher.emitter = watchAlt(path);
		watcher.alt = true;
		watchers.alt.push(watcher);
	}
	emitter._close = emitter.close;
	emitter.close = function () {
		var last;
		emitter._close();
		remove.call(watchers[watcher.alt ? 'alt' : 'reg'], watcher);

		// Switch if possible
		switchAltsToReg();
	};
	emitter.on('end', function () {
		watch.clear(path);
		emitter.close();
	});
	emitter.on('change', function () {
		++watcher.count;
	});
	if (watcher.alt) {
		onLstat(watcher);
	}
	return emitter;
}, { primitive: true });

module.exports = exports = function (path) {
	return watch(resolve(String(path)));
};
exports.watch = watch;
