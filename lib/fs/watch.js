'use strict';

var nextTick  = process.nextTick
  , fs        = require('fs')
  , path      = require('path')
  , lstat     = require('deferred').promisify(fs.lstat)
  , watch     = fs.watch
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , ee        = require('event-emitter')

  , opts = { persistent: false }, watchPath;

module.exports = watchPath = memoize.call(function (path) {
	var emitter, stats, listener, watcher, done = false
	  , onEnd, clearDone;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			emitter = null;
			watchPath.clearCache(path);
			watcher.close();
		}
	};

	clearDone = function () {
		done = false;
	};

	listener = function (type) {
		var nstats, nwatcher;
		// console.log("EVENT", path, type, !!emitter, !!stats, stats && stats.isFile(), done);
		if (!emitter || !stats || done) {
			return;
		}
		if ((type === 'rename') || stats.isFile()) {
			done = true;
			nextTick(clearDone);
			watcher.close();
			try {
				nwatcher = watch(path, opts, listener);
			} catch (e) {
				onEnd();
				return;
			}
			watcher = nwatcher;
			watcher.on('error', onEnd);
			lstat(path).end(function (nstats) {
				if (!emitter) {
					return;
				}
				if ((nstats.isFile() && stats.isDirectory()) ||
					(nstats.isDirectory() && stats.isFile())) {
					onEnd();
					return;
				}
				if (stats.isDirectory() ||
					 ((stats.ctime.valueOf() !== nstats.ctime.valueOf()) ||
						 ((stats.mtime.valueOf() !== nstats.mtime.valueOf()) ||
							 (stats.size !== nstats.size)))) {
					emitter.emit('change');
				}
				stats = nstats;
			}, onEnd);
		}
	};

	watcher = watch(path, opts, listener);
	watcher.on('error', onEnd);
	emitter = ee();
	lstat(path)(function (nstats) {
		stats = nstats;
	}, onEnd);
	return emitter;
});
