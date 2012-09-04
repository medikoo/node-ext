'use strict';

var toUint = require('es5-ext/lib/Number/to-uint')

  , count = 0, limit = Infinity, callbacks = [];

module.exports = exports = function (cb) {
	if (count < limit) {
		cb();
		return;
	}
	callbacks.push(cb);
};

exports.open = function () {
	++count;
};
exports.close = function () {
	if ((--count < limit) && callbacks.length) {
		do {
			callbacks.shift()();
		} while ((count < limit) && callbacks.length);
	}
};

require('child_process').exec('ulimit -n', { env: process.env },
	function (err, stdout, stderr) {
		if (!stdout) {
			return;
		}
		stdout = stdout.trim();
		if (isNaN(stdout)) {
			return;
		}
		// We subtract 25 to give eventual outer processes some air
		limit = Math.max(Number(stdout) - 25, 5);
	});

exports.isAvailable = function (padding) {
	return count < (limit - toUint(padding));
};
