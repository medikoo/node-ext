// Copy file
// Credit: Isaac Schlueter
// http://groups.google.com/group/nodejs/msg/ef4de0b516f7d5b8

'use strict';

var util = require('util')
  , fs   = require('fs')

  , stat = fs.stat, createReadStream = fs.createReadStream
  , createWriteStream = fs.createWriteStream

module.exports = function (source, dest, cb) {
	stat(source, function (err, stats) {
		var stream;
		if (err) {
			cb(err);
			return;
		}
		try {
			stream = createReadStream(source);
			stream.on('error', cb)
			stream.pipe(createWriteStream(dest, { mode: stats.mode }));
			stream.on('end', cb);
		} catch (e) {
			cb(e);
		}
	});
};
