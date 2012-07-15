'use strict';

var fs              = require('fs')
  , lstatSync       = fs.lstatSync
  , promisify       = require('deferred').promisify
  , ee              = require('event-emitter')
  , getTypeFromStat = require('./get-type-from-stat')

  , lstat = promisify(fs.lstat), readdir = promisify(fs.readdir)

  , watch, other, directory, timeout = 1500;

other = function (path, emitter, stats) {
	var onEnd, type;
	onEnd = function () {
		emitter.emit('end');
		emitter.allOff();
		watch.clearCache(path);
	};
	type = getTypeFromStat(stats);
	setTimeout(function self() {
		lstat(path).end(function (nstats) {
			var nType = getTypeFromStat(nstats);
			if (type !== nType) {
				onEnd();
				return;
			}
			if ((stats.ctime.valueOf() !== nstats.ctime.valueOf()) ||
				((stats.mtime.valueOf() !== nstats.mtime.valueOf()) ||
					(stats.size !== nstats.size))) {
				emitter.emit('change');
			}
			setTimeout(self, timeout);
		}, onEnd);
	}, timeout);
};

directory = function (path, emitter) {
	var onEnd, type, data, compare;
	onEnd = function () {
		emitter.emit('end');
		emitter.allOff();
		watch.clearCache(path);
	};
	compare = function (file, index) {
		return data[index] === file;
	};
	readdir(path).end(function (files) {
		data = files.sort();
		setTimeout(function self() {
			readdir(path).end(function (files) {
				if ((files.length !== data.length) || !files.sort().every(compare)) {
					data = files;
					emitter.emit('change');
				}
				setTimeout(self, timeout);
			}, onEnd);
		}, timeout);
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

watch = require('./watch');
