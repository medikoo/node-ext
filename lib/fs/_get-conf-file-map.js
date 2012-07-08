// Function that provides map of rules found in ignorefiles for given ignorefile
// type. Additinally it invokes event on changes in map which are results of
// changes in ignorefiles.

'use strict';

var call      = Function.prototype.call
  , trim      = call.bind(String.prototype.trim)
  , compact   = require('es5-ext/lib/Array/prototype/compact')
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , deferred  = require('deferred')
  , readFile  = deferred.promisify(require('fs').readFile)
  , dirname   = require('path').dirname
  , sep       = require('../path/sep')
  , ee        = require('event-emitter')
  , watchPath = require('./watch-path')

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/
  , Map, readRules, updateRoot, paths, readRulesFile;

paths = function (root, path2) {
	if (root === path2) {
		return [root];
	}
	return [root].concat(path2.slice(root.length + 1).split(sep)
		.map(function (path) {
			return root += sep + path;
		}));
};

readRulesFile = function (path) {
	return readFile(path)(function (src) {
		return compact.call(String(src).split(eolRe).map(trim)).reverse();
	}, []);
};

readRules = memoize.call(function (path) {
	var watcher, promise, current = [];
	watcher = watchPath(path);
	promise = ee(readRulesFile(path));

	promise.end(function (data) {
		current = data;
	}, null);
	watcher.on('change', function (event) {
		if (event.type === 'remove') {
			if (current.length) {
				current = promise._base.value = [];
				promise.emit('change', current);
			}
		} else {
			readRulesFile(path)(function (data) {
				if (String(data) !== String(current)) {
					current = promise._base.value = data;
					promise.emit('change', data);
				}
			});
		}
	});
	return promise;
});

Map = function (path, mode) {
	var def, root;
	def = deferred();
	this.path = path;
	this.mode = mode;
	this.promise = ee(def.promise);
	this.data = { root: null, map: {} };

	root = mode.findRoot(path + sep + '/x');
	root.on('change', this.updateRoot.bind(this));
	root.end(function (root) {
		if (root) {
			this.data.root = root;
			this.addPaths(root, this.path).end(function () {
				def.resolve(this.data);
			}.bind(this), null);
		} else {
			def.resolve(this.data);
		}
	}.bind(this), null);

	return this.promise;
};
Map.prototype = {
	listener: memoize.call(function (path) {
		return function (rules) {
			this.data.map[path] = rules;
			this.promise.emit('change', this.data);
		}.bind(this);
	}, { method: 'listener' }),
	addPaths: function (root, path) {
		return deferred.map(paths(root, path), function (path) {
			var rules = readRules(path + sep + this.mode.filename);
			rules.on('change', this.listener(path));
			return rules(function (rules) {
				this[path] = rules;
			}.bind(this.data.map));
		}, this);
	},
	removePaths: function (root, path) {
		paths(root, path).forEach(function (path) {
			readRules(path + sep + this.mode.filename)
				.off('change', this.listener(path));
			delete this.data.map[path];
		}, this);
	},
	updateRoot: function (root) {
		if (!root) {
			this.removePaths(this.data.root, this.path);
			this.data.root = null;
			this.promise.emit('change', this.data);
		} else if (!this.data.root) {
			this.data.root = root;
			this.addPaths(root, this.path)
				.end(this.promise.emit.bind(this.promise, 'change', this.data), null);
		} else if (this.data.root < root) {
			this.removePaths(this.data.root, dirname(root));
			this.data.root = root;
			this.promise.emit('change', this.data);
		} else {
			this.addPaths(root, dirname(this.data.root))
				.end(this.promise.emit.bind(this.promise, 'change', this.data), null);
			this.data.root = root;
		}
	}
};

module.exports = memoize.call(function (path, mode) {
	return new Map(path, mode);
});
