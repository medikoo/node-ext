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
	var end, close, type, listener;

	end = function () {
		if (emitter) {
			emitter.emit('end');
			close();
		}
	};

	close = function () {
		unwatchFile(path, listener);
		emitter = null;
	};

	emitter.end = end;
	emitter.close = close;
	type = getTypeFromStat(stats);
	watchFile(path, opts, listener = function (nstats) {
		var nType;
		if (!emitter) {
			return;
		}
		if (!nstats.ctime.getTime() && !nstats.mode) {
			end();
			return;
		}
		nType = getTypeFromStat(nstats);
		if (type !== nType) {
			end();
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
	var end, close, type, data, compare, listener;

	end = function () {
		if (emitter) {
			emitter.emit('end');
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

	emitter.end = end;
	emitter.close = close;
	readdir(path).end(function (files) {
		data = files.sort();
		watchFile(path, opts, listener = function (stats) {
			if (!emitter) {
				return;
			}
			if (!stats.ctime.getTime() && !stats.mode) {
				end();
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
			}, end);
		});
	}, end);
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
