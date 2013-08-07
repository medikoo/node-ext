// Require module in given context

'use strict';

var Module   = require('module')
  , readFile = require('fs').readFileSync
  , dirname  = require('path').dirname
  , vm       = require('vm')
  , errorMsg = require('./is-module-not-found-error')

  , wrap = Module.wrap

  , modRequire = Module.prototype.require || function (path) {
	return Module._load(path, this);
};

module.exports = function (path, context) {
	var fmodule, content, dirpath;

	if ((context === global) ||
			(context.process && (context.process.title === 'node') &&
			(context.pid === global.pid))) {
		return require(path);
	}
	dirpath = dirname(path);
	fmodule = new Module(path, module);
	fmodule.filename = path;
	fmodule.paths = Module._nodeModulePaths(dirpath);
	fmodule.require = modRequire;
	try {
		content = readFile(path, 'utf8');
	} catch (e) {
		throw new Error(errorMsg.pattern.replace(errorMsg.token, path));
	}
	vm.runInContext(wrap(content), context).call(fmodule.exports,
		fmodule.exports, fmodule.require.bind(fmodule), fmodule, path, dirpath);
	fmodule.loaded = true;
	return fmodule.exports;
};
