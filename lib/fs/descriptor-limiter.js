// Pretty same approach as in fs-graceful package by Isaac Schlueter
//
// Differences:
// 1. Focuses only on file descriptors limit problem
// 2. Gives access to taken/available descriptors count and allows setting of
//    limit by external module. Thanks to that we  also cover descriptors opened
//    by fs.watch module (when ./watch.js wrap is used)
// 3. More bulletproof (I assume) error handling logic

'use strict';

var last = require('es5-ext/lib/Array/prototype/last')
  , d    = require('es5-ext/lib/Object/descriptor')
  , fs   = require('fs')

  , max = Math.max
  , open = fs.open, openSync = fs.openSync
  , close = fs.close, closeSync = fs.closeSync
  , readdir = fs.readdir

  , count = 0, limit = Infinity, queue = []
  , release;

release = function () {
	var name, args, cb;
	while ((count < limit) && (name = queue.shift())) {
		try {
			fs[name].apply(fs, args = queue.shift());
		} catch (e) {
			cb = last.call(args);
			if (typeof cb === 'function') {
				cb(e);
			}
		}
	}
};

fs.open = function (path, flags, mode, cb) {
	var openCount, args;
	if (count >= limit) {
		queue.push('open', arguments);
		return;
	}
	openCount = count++;
	args = arguments;
	cb = last.call(args);
	open(path, flags, mode, function (err, fd) {
		if (err) {
			--count;
			if (err.code === 'EMFILE') {
				if (limit > openCount) {
					limit = openCount;
				}
				queue.push('open', args);
				return;
			}
		}
		if (typeof cb === 'function') cb(err, fd);
	});
};

fs.openSync = function (path, flags, mode) {
	var result = openSync.apply(this, arguments);
	++count;
	return result;
};

fs.close = function (fd, cb) {
	close(fd, function (err) {
		if (!err) {
			--count;
			release();
		}
		if (typeof cb === 'function') {
			cb(err);
		}
	});
};

fs.closeSync = function (fd) {
	var result;
	result = closeSync(fd);
	--count;
	release();
	return result;
};

fs.readdir = function (path, callback) {
	var openCount, args;
	if (count >= limit) {
		queue.push('readdir', arguments)
	}
	openCount = count++;
	args = arguments;
	readdir(path, function (err, result) {
		--count;
		if (err && err.code === 'EMFILE') {
			if (limit > openCount) {
				limit = openCount;
			}
			queue.push('readdir', args);
			return;
		}
		if (typeof callback === 'function') callback(err, result);
	});
};

Object.defineProperties(exports, {
	limit: d.gs(function () {
		return limit;
	}, function (nLimit) {
		if (limit >= nLimit) {
			limit = max(nLimit, 5);
		}
	}),
	available: d.gs(function () {
		return max(limit - count, 0);
	}),
	taken: d.gs(function () {
		return count;
	}),
	open: d(function () {
		++count;
	}),
	close: d(function () {
		--count;
	})
});
