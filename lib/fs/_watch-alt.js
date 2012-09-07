'use strict';

// var log = require('./logger');

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

	// log("_WATCH-ALT", path, "INIT AS OTHER");

	end = function (err) {
		if (emitter) {
			emitter.emit('end', err);
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
		var nType, err;
		if (!emitter) {
			return;
		}
		// log("_WATCH-ALT", path, "EVENT", nstats);
		if (!nstats.ctime.getTime() && !nstats.mode) {
			// log("_WATCH-ALT", path, "END BY LACK OF STATS");
			// It means that file doesn't exist enymore
			err = new Error("File doesn't exist");
			err.code = 'ENOENT';
			end(err);
			return;
		}
		nType = getTypeFromStat(nstats);
		if (type !== nType) {
			// log("_WATCH-ALT", path, "END BY TYPE CHANGE");
			err = new Error("File type have changed");
			err.code = 'DIFFTYPE';
			end(err);
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

	// log("_WATCH-ALT", path, "INIT AS DIRECTORY");

	end = function (err) {
		if (emitter) {
			// log("_WATCH-ALT", path, "END", err.code, err);
			emitter.emit('end', err);
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
			var err;
			if (!emitter) {
				return;
			}
			// log("_WATCH-ALT", path, "EVENT", stats);
			if (!stats.ctime.getTime() && !stats.mode) {
				// log("_WATCH-ALT", path, "END BY LACK OF STATS");
				// It means that dir doesn't exist enymore
				err = new Error("Directory doesn't exist");
				err.code = 'ENOENT';
				end(err);
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
