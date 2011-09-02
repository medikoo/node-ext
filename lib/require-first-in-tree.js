// Require first named module in tree (traversing up)
'use strict';

var path          = require('path')
  , requireSilent = require('./require-silent')(require)
  , trim          = require('./path/trim')

  , dirname = path.dirname;

module.exports = function (name, path, root) {
	var m;
	path = trim(path);
	root = root ? trim(root) : '/';
	while (true) {
		if (path === root) {
			return require(path + '/' + name);
		}
		m = requireSilent(path + '/' + name);
		if (m) {
			if (m instanceof Error) {
				throw m;
			} else {
				return m;
			}
		}
		path = dirname(path);
	}
};
