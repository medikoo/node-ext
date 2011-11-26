// Read all filenames from directory and it's subdirectories

'use strict';

var call    = Function.prototype.call
  , fs      = require('fs')
  , aritize = require('es5-ext/lib/Function/prototype/aritize')
  , curry   = require('es5-ext/lib/Function/curry').call
  , invoke  = require('es5-ext/lib/Function/invoke')
  , k       = require('es5-ext/lib/Function/k')
  , flatten = call.bind(require('es5-ext/lib/Array/prototype/flatten'))
  , a2p     = require('deferred/lib/async-to-promise').call
  , ba2p    = require('deferred/lib/async-to-promise').bind
  , all     = require('deferred/lib/join/all')
  , concat  = aritize.call(String.prototype.concat, 1)

  , trim    = require('../path/trim')

  , readdir = ba2p(fs.readdir), stat = ba2p(fs.lstat);

require('deferred/lib/ext/cb');

module.exports = function self (path, callback) {
	readdir(path = trim(path))
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
