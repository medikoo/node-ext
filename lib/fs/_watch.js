'use strict';

var nextTick        = process.nextTick
  , fs              = require('fs')
  , ee              = require('event-emitter')
  , descLimiter     = require('./_descriptor-limiter')
  , getTypeFromStat = require('./get-type-from-stat')

  , lstat = require('deferred').promisify(fs.lstat), watch = fs.watch

  , opts = { persistent: false };

module.exports = function (path, emitter) {
	var stats, fileType, listener, watcher, done = false
	  , end, clearDone, close;

	end = function () {
		if (emitter) {
			emitter.emit('end');
			close();
		}
	};

	close = function () {
		if (emitter) {
			watcher.close();
			descLimiter.close();
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
			end();
			return;
		}
		watcher = nwatcher;
		watcher.on('error', end);
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
					end();
					return;
				}
				if (stats.isDirectory() ||
					 ((stats.ctime.valueOf() !== nstats.ctime.valueOf()) ||
						 ((stats.mtime.valueOf() !== nstats.mtime.valueOf()) ||
							 (stats.size !== nstats.size)))) {
					emitter.emit('change');
				}
				stats = nstats;
			}, end);
		}
	};

	watcher = watch(path, opts, listener);
	descLimiter.open();
	watcher.on('error', end);
	if (!emitter) {
		emitter = ee();
	}
	emitter.end = end;
	emitter.close = close;
	lstat(path)(function (nstats) {
		stats = nstats;
		fileType = getTypeFromStat(stats);
	}, end);
	return emitter;
};
