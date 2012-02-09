// Read all filenames from directory and it's subdirectories

'use strict';

var fs        = require('fs')
  , k         = require('es5-ext/lib/Function/k')
  , promisify = require('deferred').promisify
  , normalize = require('../path/normalize')

  , readdir = promisify(fs.readdir), stat = promisify(fs.lstat);

module.exports = function (path, callback) {
	readdir(path = normalize(path)).map(function (file) {
		var npath = path + '/' + file;
		return stat(npath)(function (stats) {
			return stats.isDirectory() ? file : null;
		}, k(null));
	}).invoke('filter', Boolean).end(callback);
};
