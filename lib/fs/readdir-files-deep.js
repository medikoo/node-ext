'use strict';

var fs      = require('fs')
  , aritize = require('es5-ext/lib/Function/aritize')
  , curry   = require('es5-ext/lib/Function/curry')
  , invoke  = require('es5-ext/lib/Function/invoke')
  , flatten = require('es5-ext/lib/List/flatten').call
  , a2p     = require('deferred/lib/async-to-promise').call
  , all     = require('deferred/lib/chain/all')
  , concat  = aritize(String.prototype.concat, 1)

  , trim    = require('../path/trim');

module.exports = function readdir (path, callback) {
	path = trim(path);
	a2p(fs.readdir, path).then(function (files) {
		return all(files.map(function (file) {
			var npath = path + '/' + file;
			return a2p(fs.stat, npath).then(function (stats) {
				if (stats.isFile()) {
					return file;
				} else if (stats.isDirectory()) {
					return a2p(readdir, npath).then(invoke('map', concat, file + '/'));
				} else {
					return null;
				}
			});
		}))
		.then(invoke('filter', Boolean))
		.then(flatten)
		.then(curry(callback, null));
	}).end(callback);
};
