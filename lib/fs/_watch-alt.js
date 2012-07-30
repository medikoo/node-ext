'use strict';

var fs              = require('fs')
  , lstatSync       = fs.lstatSync
  , promisify       = require('deferred').promisify
  , ee              = require('event-emitter')
  , getTypeFromStat = require('./get-type-from-stat')

  , lstat = promisify(fs.lstat), readdir = promisify(fs.readdir)
  , watchFile = fs.watchFile, unwatchFile = fs.unwatchFile

  , other, directory, opts = { persistent: false, interval: 1500 };

other = function (path, emitter, stats) {
	var onEnd, close, type, listener;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			close();
		}
	};

	close = function () {
		unwatchFile(path, listener);
		emitter = null;
	};

	emitter.close = onEnd;
	emitter._close = close;
	type = getTypeFromStat(stats);
	watchFile(path, opts, listener = function (nstats) {
		var nType;
		if (!emitter) {
			return;
		}
		if (!nstats.ctime.getTime() && !nstats.mode) {
			onEnd();
			return;
		}
		nType = getTypeFromStat(nstats);
		if (type !== nType) {
			onEnd();
			return;
		}
		if ((stats.ctime.valueOf() !== nstats.ctime.valueOf()) ||
			((stats.mtime.valueOf() !== nstats.mtime.valueOf()) ||
				(stats.size !== nstats.size))) {
			emitter.emit('change');
 		}
		stats = nstats;
	});
};

directory = function (path, emitter) {
	var onEnd, close, type, data, compare, listener;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			close();
		}
	};

	close = function () {
		if (emitter) {
			if (listener) {
				unwatchFile(listener);
			}
			emitter = null;
		}
	};

	compare = function (file, index) {
		return data[index] === file;
	};

	emitter.close = onEnd;
	emitter._close = close;
	readdir(path).end(function (files) {
		data = files.sort();
		watchFile(path, opts, listener = function (stats) {
			if (!emitter) {
				return;
			}
			if (!stats.ctime.getTime() && !stats.mode) {
				onEnd();
				return;
			}
			readdir(path).end(function (files) {
				if (!emitter) {
					return;
				}
				if ((files.length !== data.length) || !files.sort().every(compare)) {
					data = files;
					emitter.emit('change');
				}
			}, onEnd);
		});
	}, onEnd);
};

module.exports = function (path, emitter) {
	var stats = lstatSync(path);
	if (!emitter) {
		emitter = ee();
	}
	if (stats.isDirectory()) {
		directory(path, emitter);
	} else {
		other(path, emitter, stats);
	}
	return emitter;
};
