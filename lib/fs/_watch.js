'use strict';

var nextTick        = process.nextTick
  , fs              = require('fs')
  , ee              = require('event-emitter')
  , getTypeFromStat = require('./get-type-from-stat')

  , lstat = require('deferred').promisify(fs.lstat), watch = fs.watch

  , opts = { persistent: false };

module.exports = function (path) {
	var emitter, stats, fileType, listener, watcher, done = false
	  , onEnd, clearDone;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			watcher.close();
			emitter = null;
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

	watcher = watch(path, opts, listener);
	watcher.on('error', onEnd);
	emitter = ee();
	lstat(path)(function (nstats) {
		stats = nstats;
		fileType = getTypeFromStat(stats);
	}, onEnd);
	return emitter;
};
