// Read all filenames from directory and it's subdirectories

'use strict';

var call      = Function.prototype.call
  , fs        = require('fs')
  , aritize   = require('es5-ext/lib/Function/prototype/aritize')
  , invoke    = require('es5-ext/lib/Function/invoke')
  , k         = require('es5-ext/lib/Function/k')
  , flatten   = call.bind(require('es5-ext/lib/Array/prototype/flatten'))
  , deferred  = require('deferred')
  , concat    = aritize.call(String.prototype.concat, 1)
  , normalize = require('../path/normalize')

  , readdir = deferred.promisify(fs.readdir)
  , stat    = deferred.promisify(fs.lstat);

module.exports = function self (path, callback) {
	readdir(path = normalize(path))
	(function (files) {
		return deferred.map(files, function (file) {
			var npath = normalize(path + '/' + file);
			return stat(npath)
			(function (stats) {
				if (stats.isFile()) {
					return file;
				} else if (stats.isDirectory()) {
					return deferred.promisify(self)(npath)
					(invoke('map', function (subfile) {
						return normalize(file + '/' + subfile);
					}));
				} else {
					return null;
				}
			}, file);
		})
		(invoke('filter', Boolean))
		(flatten);
	}).end(callback);
};
