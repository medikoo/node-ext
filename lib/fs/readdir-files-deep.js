// Read all filenames from directory and it's subdirectories

'use strict';

var fs      = require('fs')
  , aritize = require('es5-ext/lib/Function/aritize').call
  , curry   = require('es5-ext/lib/Function/curry').call
  , invoke  = require('es5-ext/lib/Function/invoke')
  , k       = require('es5-ext/lib/Function/k')
  , flatten = require('es5-ext/lib/List/flatten').call
  , a2p     = require('deferred/lib/async-to-promise').call
  , ba2p    = require('deferred/lib/async-to-promise').bind
  , all     = require('deferred/lib/join/all')
  , concat  = aritize(String.prototype.concat, 1)

  , trim    = require('../path/trim')

  , readdir = ba2p(fs.readdir), stat = ba2p(fs.stat);

module.exports = function self (path, callback) {
	path = trim(path);
	readdir(path)
	(function (files) {
		return all(files, function (file) {
			var npath = path + '/' + file;
			return stat(npath)
			(function (stats) {
				if (stats.isFile()) {
					return file;
				} else if (stats.isDirectory()) {
					return a2p(self, npath)
					(invoke('map', concat, file + '/'));
				} else {
					return null;
				}
			}, k(file));
		})
		(invoke('filter', Boolean))
		(flatten);
	}).cb(callback);
};
