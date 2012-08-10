// fs.writeFile that's safe for simultaneous calls for same file.
// In such event write that is ongoing is exited and new one is initialized

'use strict';

var isCallable = require('es5-ext/lib/Object/is-callable')
  , deferred   = require('deferred')
  , fs         = require('fs')
  , resolve    = require('path').resolve

  , next, writeAll, cache = {}, writeFile;

next = function (path) {
	var data;
	if (cache[path] === true) {
		delete cache[path];
	} else {
		data = cache[path];
		delete cache[path];
		writeFile(path, data.data, data.encoding, data.resolve);
	}
};

writeAll = function (path, fd, buffer, offset, length, resolve) {
	fs.write(fd, buffer, offset, length, offset, function (writeErr, written) {
		if (writeErr) {
			fs.close(fd, function() {
				resolve(writeErr);
				next(path);
			});
		} else {
			if ((written === length) || (cache[path] !== true)) {
				fs.close(fd, function () {
					resolve();
					next(path);
				});
			} else {
				writeAll(path, fd, buffer, offset + written, length - written, resolve);
			}
		}
	});
};

writeFile = function (path, data, encoding, resolve) {
	var def;
	if (!resolve) {
		def = deferred();
		resolve = def.resolve;
	}
	if (cache[path]) {
		if (cache[path] !== true) {
			cache[path].resolve(null);
		}
		cache[path] = { data: data, encoding: encoding, resolve: resolve };
		return def && def.promise;
	}
	cache[path] = true;

	if (!encoding) {
		encoding = 'utf8';
	}
	fs.open(path, 'w', 438 /*=0666*/, function (openErr, fd) {
		if (openErr) {
			resolve(openErr);
			next(path);
		} else  if (cache[path] === true) {
			var buffer = Buffer.isBuffer(data) ? data : new Buffer('' + data,
				encoding);
			writeAll(path, fd, buffer, 0, buffer.length, resolve);
		} else {
			fs.close(fd, function () {
				resolve();
				next(path);
			});
		}
	});
	return def && def.promise;
};
writeFile.returnsPromise = true;

module.exports = exports = function (path, data) {
	var encoding, cb;

	path = resolve(String(path));
	encoding = arguments[2];
	cb = arguments[3];
	if ((cb == null) && isCallable(encoding)) {
		cb = encoding;
		encoding = null;
	}

	return writeFile(path, data, encoding).cb(cb);
};
exports.returnsPromise = true;
exports.writeFile = writeFile;
