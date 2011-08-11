// Return require function for given path

'use strict';

var Module     = require('module')
  , stat       = require('fs').statSync
  , getDirname = require('path').dirname
  , ptrim      = require('./path/trim')
  , modRequire = Module.prototype.require || function (path) {
		return Module._load(path, this);
	}

  , cache    = {};

module.exports = function (filename) {
	var dirname, stats, fmodule, id;
	if (!cache[filename]) {
		stats = stat(filename);
		if (stats.isFile() || !stats.isDirectory()) {
			dirname = getDirname(filename);
		} else {
			dirname = ptrim(filename);
		}
		if (!cache[dirname]) {
			fmodule = Module._cache[filename];
			if (!fmodule) {
				id = dirname + '/__get-require.next.js';
				fmodule = new Module(id, module);
				fmodule.filename = id;
				fmodule.paths = Module._nodeModulePaths(dirname);
				fmodule.loaded = true;
			}
			cache[dirname] = modRequire.bind(fmodule);
		}
		cache[filename] = cache[dirname];
	}
	return cache[filename];
};


// var dirname, stats;
// if (!cache[mpath]) {
// 	stats = fs.statSync(mpath);
// 	if (stats.isFile() || !stats.isDirectory()) {
// 		dirname = path.dirname(mpath);
// 	} else {
// 		dirname = ptrim(mpath);
// 	}
// 	if (!cache[dirname]) {
// 		copy(tplPath, dirname + '/__get-require.next.js');
// 		cache[dirname] = require(dirname + '/__get-require.next');
// 	}
// 	cache[mpath] = cache[dirname];
// }
// return cache[mpath];
