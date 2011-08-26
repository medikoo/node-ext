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
	readdir(path = trim(path))
	(function (files) {
		return all(files, function (file) {
			var npath = path + '/' + file;
			return stat(npath)
			(function (stats) {
				return stats.isDirectory() ? file : null;
			}, k(null));
		})
		(invoke('filter', Boolean))
	}).cb(callback);
};
