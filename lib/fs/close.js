'use strict';

var deferred    = require('deferred')
  , original    = require('fs').close
  , descLimiter = require('./_descriptor-limiter')
  , descriptors = require('./open')._openDescriptors

  , close;

close = function (fd) {
	var def = deferred(), index

	index = descriptors.indexOf(fd);
	original(fd, function (err, result) {
		if (index !== -1) {
			descLimiter.close();
			descriptors.splice(index, 1);
		}
		def.resolve(err || result);
	});
	return def.promise;
};
close.returnsPromise = true;

module.exports = exports = function (fd, callback) {
	return close(fd).cb(callback);
};
exports.returnsPromise = true;
exports.close = close;
