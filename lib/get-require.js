// Return require function for given path

'use strict';

var fs    = require('fs')
  , path  = require('path')
  , ptrim = require('./path/trim')
  , copy  = require('./fs/copy-sync')

  , stat = fs.statSync, unlink = fs.unlinkSync
  , getDirname = path.dirname

  , cache = {}, tplPath = __dirname + '/get-require.tpl';

module.exports = function (filename) {
	var dirname, stats, path;
	filename = ptrim(filename);
	if (!cache[filename]) {
		stats = stat(filename);
		dirname = stats.isDirectory() ? filename : getDirname(filename);
		if (!cache[dirname]) {
			copy(tplPath, path = dirname + '/__get-require.next.js');
			cache[dirname] = require(path);
			unlink(path);
		}
		cache[filename] = cache[dirname];
	}
	return cache[filename];
};
