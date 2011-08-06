'use strict';

var Module        = require('module')
  , wrap          = Module.wrap
  , readFile      = require('fs').readFileSync
  , dirname       = require('path').dirname
  , vm            = require('vm')
  , createContext = vm.createContext
  , runInContext  = vm.runInContext
  , errorMsg      = require('./is-module-not-found-error')

  , props = ['require', 'module', 'exports'];

module.exports = function (path, context) {
	var fmodule, r, content, dirpath;
	console.log(context === global, path);
	if (context === global) {
		return require(path);
	} else {
		dirpath = dirname(path);
		fmodule = new Module(path, module);
		fmodule.filename = path;
		fmodule.paths = Module._nodeModulePaths(dirpath);
		try {
			content = readFile(path, 'utf8');
		} catch (e) {
			throw new Error(errorMsg.pattern.replace(errorMsg.token, path));
		}
		vm.runInContext(wrap(content), context).call(fmodule.exports, fmodule.exports,
				fmodule.require.bind(fmodule), fmodule, path, dirpath);
		fmodule.loaded = true;
		return fmodule.exports;
	}
};
