'use strict';

// var log = require('./logger');

var create         = Object.create
  , last           = require('es5-ext/lib/Array/prototype/last')
  , remove         = require('es5-ext/lib/Array/prototype/remove')
  , descLimiter    = require('./descriptor-limiter')
  , resolve        = require('path').resolve
  , watchReg       = require('./_watch')
  , watchAlt       = require('./_watch-alt')
  , memoizeWatcher = require('./_memoize-watcher')

  , max = Math.max
  , watch, watchers, compare, releaseDescs, switchToAlt, switchToReg
  , switchAltsToReg, onLstat, isAvail;

watchers = { reg: [], alt: [] };

compare = function (a, b) {
	return b.count - a.count;
};

isAvail = function () {
	return descLimiter.available > 50;
};

switchToAlt = function (watcher) {
	var closePrevious = watcher.emitter._close;
	remove.call(watchers.reg, watcher);
	// log("WATCH", watcher.path, "SWITCH TO ALT");
	try {
		watchAlt(watcher.path, watcher.emitter);
	} catch (err) {
		if ((err.code === 'ENOENT') || (err.code === 'DIFFTYPE')) {
			// log("WATCH", watcher.path, "SWITCH TO ALT: FAILED, ", err.code, err);
			watcher.emitter.end(err);
			return;
		}
		// log("WATCH", watcher.path, "SWITCH TO ALT: FAILED", e);
		throw e;
	}
	closePrevious();
	descLimiter.close();
	watcher.alt = true;
	onLstat(watcher);
	watchers.alt.push(watcher);
	watchers.alt.sort(compare);
	// log("WATCH", watcher.path, "SWITCH TO ALT: SUCCESS");
};

switchToReg = function (watcher) {
	var emitter = watcher.emitter
	  , closePrevious = emitter._close;

	// log("WATCH", watcher.path, "SWITCH TO REG");
	try {
		watchReg(watcher.path, watcher.emitter);
	} catch (err) {
		if (err.code === 'EMFILE') {
			// log("WATCH", watcher.path, "SWITCH TO REG FAILED, EMFILE");
			descLimiter.limit = descLimiter.taken;
			releaseDescs();
			return;
		} else if ((err.code === 'ENOENT') || (err.code === 'DIFFTYPE')) {
			// log("WATCH", watcher.path, "SWITCH TO REG FAILED, ", err.code, err);
			emitter.off('change', emitter._watchSwitchListener);
			delete emitter._watchSwitchListener;
			remove.call(watchers.alt, watcher);
			watcher.emitter.end(err);
			return;
		}
		// log("WATCH", watcher.path, "SWITCH TO REG FAILED", err);
		throw e;
	}
	emitter.off('change', emitter._watchSwitchListener);
	delete emitter._watchSwitchListener;
	remove.call(watchers.alt, watcher);
	closePrevious();
	descLimiter.open();
	watcher.alt = false;
	watchers.reg.push(watcher);
	watchers.reg.sort(compare);
};

switchAltsToReg = function () {
	// log("WATCH", "SWITCH TO REG (FREE SLOTS)");
	while (watchers.alt.length && isAvail()) {
		switchToReg(watchers.alt[0]);
	}
};

releaseDescs = function () {
	var count = max(watchers.reg.length - (descLimiter.taken - 50), 0);
	// log("WATCH", "RELEASE TAKEN REGS", count);
	if (count) {
		watchers.reg.sort(compare).slice(-count).forEach(switchToAlt);
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
			candidate = last.call(watchers.reg.sort(compare));
			if (candidate.count >= watcher.count) return;

			// log("WATCH", watcher.path, "PRIORITY SWITCH REG->ALT and ALT->REG", candidate.path, watcher.count, candidate.count);

			// Move last regular watcher to lstat watch
			switchToAlt(candidate);

			// Move current watcher to regular watch
			switchToReg(watcher);
		}
	});
};

watch = memoizeWatcher(function self(path) {
	var emitter, watcher;
	// log("WATCH", path, "INIT");
	watcher = { path: path, count: 0 };
	if (isAvail()) {
		try {
			emitter = watcher.emitter = watchReg(path);
		} catch (e) {
			if (e.code === 'EMFILE') {
				// log("WATCH", path, "FAILED EMFILE");
				descLimiter.limit = descLimiter.taken;
				releaseDescs();
				return self(path);
			}
			// log("WATCH", path, "FAILED", e);
			throw e;
		}
		// log("WATCH", path, "STARTED: REGULAR");
		descLimiter.open();
		watchers.reg.push(watcher);
	} else {
		emitter = watcher.emitter = watchAlt(path);
		// log("WATCH", path, "STARTED: ALT");
		watcher.alt = true;
		watchers.alt.push(watcher);
	}
	emitter._close = emitter.close;
	emitter.close = function () {
		var last;
		// log("WATCH", path, "ENDED: ", watcher.alt ? "ALT" : "REGULAR");
		emitter._close();
		remove.call(watchers[watcher.alt ? 'alt' : 'reg'], watcher);
		if (!watcher.alt) {
			descLimiter.close();
			// Switch if possible
			switchAltsToReg();
		}
	};
	emitter.on('end', function () {
		watch.clear(path);
		emitter.close();
	});
	emitter.on('change', function () {
		// log("WATCH", path, "CHANGE AS", watcher.alt ? "ALT" : "REGULAR");
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
