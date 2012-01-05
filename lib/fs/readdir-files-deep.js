// Read all filenames from directory and it's subdirectories

'use strict';

var call    = Function.prototype.call
  , fs      = require('fs')
  , aritize = require('es5-ext/lib/Function/prototype/aritize')
  , invoke  = require('es5-ext/lib/Function/invoke')
  , k       = require('es5-ext/lib/Function/k')
  , flatten = call.bind(require('es5-ext/lib/Array/prototype/flatten'))
  , deferred = require('deferred')
  , concat  = aritize.call(String.prototype.concat, 1)

  , trim    = require('../path/trim')

  , readdir = deferred.promisify(fs.readdir)
  , stat = deferred.promisify(fs.lstat);

require('deferred/lib/ext/promise/cb');

module.exports = function self (path, callback) {
	readdir(path = trim(path))
	(function (files) {
		return deferred.map(files, function (file) {
			var npath = path + '/' + file;
			return stat(npath)
			(function (stats) {
				if (stats.isFile()) {
					return file;
				} else if (stats.isDirectory()) {
					return deferred.promisify(self)(npath)
					(invoke('map', concat, file + '/'));
				} else {
					return null;
				}
			}, file);
		})
		(invoke('filter', Boolean))
		(flatten);
	}).cb(callback);
};
