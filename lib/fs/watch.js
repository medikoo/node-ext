'use strict';

var nextTick        = process.nextTick
  , fs              = require('fs')
  , resolve         = require('path').resolve
  , lstat           = require('deferred').promisify(fs.lstat)
  , watch           = fs.watch
  , memoize         = require('es5-ext/lib/Function/prototype/memoize')
  , ee              = require('event-emitter')
  , getTypeFromStat = require('./get-type-from-stat')

  , opts = { persistent: false }, watchPath, watchAlt;

module.exports = watchPath = memoize.call(function (path) {
	var emitter, stats, fileType, listener, watcher, done = false
	  , onEnd, clearDone;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			watcher.close();
			emitter = null;
			watchPath.clearCache(path);
		}
	};

	clearDone = function () {
		done = false;
	};

	listener = function (type) {
		var nstats, nwatcher;
		// console.log("EVENT", path, type, !!emitter, !!stats, stats && stats.isFile(), done);
		watcher.close();
		try {
			nwatcher = watch(path, opts, listener);
		} catch (e) {
			if (e.code === 'EMFILE') {
				// Shouldn't happen, but we can't be 100% sure
				// Too many concurrent watches, fallback to manual stat based watch
				try {
					watchAlt(path, emitter);
					return;
				} catch (e) {}
			}
			onEnd();
			return;
		}
		watcher = nwatcher;
		watcher.on('error', onEnd);
		if (!stats || done) {
			return;
		}
		if ((type === 'rename') || stats.isFile()) {
			done = true;
			nextTick(clearDone);
			lstat(path).end(function (nstats) {
				var newFileType;
				if (!emitter) {
					return;
				}
				newFileType = getTypeFromStat(nstats);
				if (fileType !== newFileType) {
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

	try {
		watcher = watch(path, opts, listener);
	} catch (e) {
		if (e.code === 'EMFILE') {
			// Too many concurrent watches, fallback to manual stat based watch
			return watchAlt(path);
		}
		throw e;
	}
	watcher.on('error', onEnd);
	emitter = ee();
	lstat(path)(function (nstats) {
		stats = nstats;
		fileType = getTypeFromStat(stats);
	}, onEnd);
	return emitter;
}, { resolvers: [function (path) {
	return resolve(String(path));
}], primitive: true });

watchAlt = require('./_watch-alt');
