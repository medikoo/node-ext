// fs.writeFile that's safe for simultaneous calls for same file.
// In such event write that is ongoing is exited and new one is initialized

'use strict';

var fs      = require('fs')
  , resolve = require('path').resolve

  , next, writeAll, cache = {};

next = function (path) {
	var args;
	if (cache[path] === true) {
		delete cache[path];
	} else {
		args = cache[path];
		delete cache[path];
		exports.apply(null, args);
	}
};

writeAll = function (path, fd, buffer, offset, length, callback) {
	// write(fd, buffer, offset, length, position, callback)
	fs.write(fd, buffer, offset, length, offset, function(writeErr, written) {
		if (writeErr) {
			fs.close(fd, function() {
				if (callback) callback(writeErr);
				next(path);
			});
		} else {
			if ((written === length) || (cache[path] !== true)) {
				fs.close(fd, function () {
					if (callback) callback.apply(null, arguments);
					next(path);
				});
			} else {
				writeAll(path, fd, buffer, offset + written, length - written, callback);
			}
		}
	});
};

exports = module.exports = function (path, data, encoding_, callback) {
	var encoding, callback_;
	path = resolve(String(path));
	if (cache[path]) {
		if (cache[path] !== true) {
			callback_ = cache[path][cache[path].length - 1];
			if (typeof callback_ == 'function') {
				callback_(null);
			}
		}
		cache[path] = arguments;
		return;
	}
	cache[path] = true;

	encoding = (typeof(encoding_) == 'string' ? encoding_ : 'utf8');
	callback_ = arguments[arguments.length - 1];
	callback = (typeof(callback_) == 'function' ? callback_ : null);
	fs.open(path, 'w', 438 /*=0666*/, function (openErr, fd) {
		if (openErr) {
			if (callback) callback(openErr);
			next(path);
		} else  if (cache[path] === true) {
			var buffer = Buffer.isBuffer(data) ? data : new Buffer('' + data,
				encoding);
			writeAll(path, fd, buffer, 0, buffer.length, callback);
		} else {
			fs.close(fd, function () {
				if (callback) callback.apply(null, arguments);
				next(path);
			});
		}
	});
};
