'use strict';

var Module        = require('module')
  , wrap          = Module.wrap
  , readFile      = require('fs').readFileSync
  , dirname       = require('path').dirname
  , vm            = require('vm')
  , createContext = vm.createContext
  , runInContext  = vm.runInContext

  , props = ['require', 'module', 'exports'];

module.exports = function (path, context) {
	var fmodule, r;
	fmodule = new Module(path, module);
	fmodule.filename = path;
	fmodule.paths = Module._nodeModulePaths(dirname);
	r = runInContext(wrap(readFile(path, 'utf8')), createContext(context),
		path, true).call(fmodule.exports, fmodule.exports,
			fmodule.require.bind(fmodule), fmodule, path, dirname(path));
	fmodule.loaded = true;
	return r;
};
