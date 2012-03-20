// Require first named module in tree (traversing up)

'use strict';

var path          = require('path')
  , requireSilent = require('./require-silent')(require)
  , errorMsg      = require('./is-module-not-found-error')
  , normalize     = require('./path/normalize')
  , separator     = require('./path/separator')

  , dirname = path.dirname;

module.exports = function (name, path, root) {
	var m;
	path = normalize(path);
	root = root ? normalize(root) : separator;
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
