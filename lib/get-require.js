// Return require function for given path

'use strict';

var fs   = require('fs')
  , path = require('path')
  , ptrim = require('./path/trim');

module.exports = function (mpath, callback) {
	fs.stat(mpath, function (err, stats) {
		if (err) {
			callback(err);
			return;
		}
		if (stats.isFile() || !stats.isDirectory()) {
			mpath = path.dirname(mpath);
		} else {
			mpath = ptrim(mpath);
		}
		mpath += '/__next-get-require__.js';
		fs.writeFile(mpath, 'module.exports = require;', function (err) {
			var r;
			if (err) {
				callback(err);
				return;
			}
			r = require(mpath.slice(0, -3));
			fs.unlink(mpath, function (err) {
				if (err) {
					callback(err);
					return;
				}
				callback(null, r);
			});
		});
	});
};
