// Require first named module in tree (traversing up)
'use strict';

var path          = require('path')
  , requireSilent = require('./require-silent')(require)
  , errorMsg      = require('./is-module-not-found-error')
  , trim          = require('./path/trim')

  , dirname = path.dirname;

module.exports = function (name, path, root) {
	var m;
	path = trim(path);
	root = root ? trim(root) : '/';
	while (true) {
		m = requireSilent(path + '/' + name);
		if (m) {
			if (m instanceof Error) {
				throw m;
			} else {
				return m;
			}
		}
		if (path === root) {
			throw new Error(errorMsg.pattern.replace(errorMsg.token, name));
		}
		path = dirname(path);
	}
};
