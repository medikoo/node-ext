// Whether given path points existing directory

'use strict';

var fs = require('fs');

module.exports = function (path, callback) {
	fs.stat(path, function (err, stats) {
		callback(err ? false : stats.isDirectory());
	});
};