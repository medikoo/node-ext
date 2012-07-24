// Function that provides map of rules found in ignorefiles for given ignorefile
// type. Additinally it invokes event on changes in map which are results of
// changes in ignorefiles.

'use strict';

var getNull   = require('es5-ext/lib/Function/k')(null)
  , extend    = require('es5-ext/lib/Object/extend')
  , deferred  = require('deferred')
  , readFile  = deferred.promisify(require('fs').readFile)
  , dirname   = require('path').dirname
  , sep       = require('../path/sep')
  , FindRoot  = require('./find-root').FindRoot
  , watchPath = require('./watch-path')

  , Map, readRules, readRulesWatch, paths, getMap;

paths = function (root, path2) {
	if (root === path2) {
		return [root];
	}
	return [root].concat(path2.slice(root.length + 1).split(sep)
		.map(function (path) {
			return root += sep + path;
		}));
};

readRules = function (path) {
	return readFile(path + sep + this.filename)(String, getNull);
};
readRulesWatch = function (path) {
	var watcher, promise, current = null;
	promise = readRules.call(this, path);
	watcher = watchPath(path + sep + this.filename);

	promise.end(function (data) {
		current = data;
	}, null);
	watcher.on('change', function (event) {
		if (event.type === 'remove') {
			if (current != null) {
				current = promise.value = null;
				promise.emit('change', current, path);
			}
		} else {
			readRules.call(this, path, this.filename).end(function (data) {
				if (data !== current) {
					current = promise.value = data;
					promise.emit('change', current, path);
				}
			}, null);
		}
	}.bind(this));
	return promise;
};

Map = function (path, watch) {
	var def, root;
	this.path = path;
	this.watch = watch;
	this.data = { root: null, map: {} };
	extend(this, deferred());
	if (this.watch) {
		this.onRulesChange = this.onRulesChange.bind(this);
		this.rulePromises = {};
	}
};
Map.prototype = {
	init: function () {
		var root = this.findRoot(this.path + sep + 'x');
		if (this.watch) {
			root.on('change', this.updateRoot.bind(this));
		}
		root.end(function (root) {
			if (root) {
				this.data.root = root;
				this.addPaths(root, this.path).end(function () {
					this.resolve(this.data);
				}.bind(this), this.resolve);
			} else {
				this.resolve(this.data);
			}
		}.bind(this), this.resolve);
		return this.promise;
	},
	onRulesChange: function (rules, path) {
		if (rules == null) {
			delete this.data.map[path];
		} else {
			this.data.map[path] = rules;
		}
		this.promise.emit('change', this.data);
	},
	addPaths: function (root, path) {
		return deferred.map(paths(root, path), function (path) {
			var rules = this.readRules(path);
			if (this.watch) {
				this.rulePromises[path] = rules;
				rules.on('change', this.onRulesChange);
			}
			return rules.cb(function (rules) {
				if (rules != null) {
					this[path] = rules;
				}
			}.bind(this.data.map), null);
		}, this);
	},
	removePaths: function (root, path) {
		paths(root, path).forEach(function (path) {
			this.rulePromises[path].off('change', this.onRulesChange);
			delete this.rulePromises[path];
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

getMap = module.exports = function (path, mode, watch) {
	var map = new Map(path, watch), isRoot;
	map.filename = mode.filename;
	isRoot = watch ? mode.isRootWatch : mode.isRoot;
	map.findRoot = function (path) {
		var finder = new FindRoot(path, watch);
		finder.isRoot = isRoot;
		finder.next();
		return finder.promise;
	};
	map.readRules = watch ? readRulesWatch : readRules;
	return map.init();
};
getMap.Map = Map;
getMap.readRules = readRules;
getMap.readRulesWatch = readRulesWatch;
