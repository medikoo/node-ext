'use strict';

var fs              = require('fs')
  , lstatSync       = fs.lstatSync
  , promisify       = require('deferred').promisify
  , ee              = require('event-emitter')
  , getTypeFromStat = require('./get-type-from-stat')

  , lstat = promisify(fs.lstat), readdir = promisify(fs.readdir)

  , other, directory, delay = 1500;

other = function (path, emitter, stats) {
	var onEnd, type, timeout;
	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			clearTimeout(timeout)
		}
	};
	emitter.close = onEnd;
	type = getTypeFromStat(stats);
	timeout = setTimeout(function self() {
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
			timeout = setTimeout(self, delay);
		}, onEnd);
	}, delay);
};

directory = function (path, emitter) {
	var onEnd, type, data, compare, timeout;
	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			clearTimeout(timeout);
		}
	};
	compare = function (file, index) {
		return data[index] === file;
	};
	emitter.close = onEnd;
	readdir(path).end(function (files) {
		data = files.sort();
		timeout = setTimeout(function self() {
			readdir(path).end(function (files) {
				if ((files.length !== data.length) || !files.sort().every(compare)) {
					data = files;
					emitter.emit('change');
				}
				timeout = setTimeout(self, delay);
			}, onEnd);
		}, delay);
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
