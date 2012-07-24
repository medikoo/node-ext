'use strict';

var isArray    = Array.isArray
  , push       = Array.prototype.push
  , call       = Function.prototype.call
  , trim       = call.bind(String.prototype.trim)
  , path       = require('path')
  , compact    = require('es5-ext/lib/Array/prototype/compact')
  , isBoolean  = require('es5-ext/lib/Boolean/is-boolean')
  , memoize    = require('es5-ext/lib/Function/prototype/memoize')
  , partial    = require('es5-ext/lib/Function/prototype/partial')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , copy       = require('es5-ext/lib/Object/copy')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , omap       = require('es5-ext/lib/Object/map')
  , deferred   = require('deferred')
  , minimatch  = require('minimatch')
  , modes      = require('./_ignorefile-modes')
  , getMap     = require('./_get-conf-file-map')
  , sep        = require('../path/sep')

  , dirname = path.dirname, resolve = path.resolve
  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/

  , applyRules, minimatchOpts, applyGlobalRules, parse, IsIgnored, isIgnored;

minimatchOpts = { matchBase: true };

parse = function (map) {
	map = copy(map);
	map.map = omap(map.map, function (str) {
		return compact.call(String(str).split(eolRe).map(trim)).reverse();
	});
	return map;
};

applyRules = function (rules, root, path) {
	var value, current = root, relPath
	  , paths = path.slice(root.length + 1).split(sep);
	while (paths.length) {
		current = current + sep + paths.shift();
		relPath = current.slice(root.length);
		value = null;
		rules.some(function (rule) {
			if (rule[0] === '!') {
				if (minimatch(relPath, rule.slice(1), minimatchOpts)) {
					value = false;
					return true;
				}
			} else if (minimatch(relPath, rule, minimatchOpts)) {
				value = true;
				return true;
			}
		});
		if (value === true) {
			return { value: true, target: current };
		}
	}
	return { value: value, target: path };
};

applyGlobalRules = function (path, rules) {
	var value;

	// Check global rules
	value = applyRules(rules, path.slice(0, path.indexOf(sep) + 1), path);
	return Boolean(value.value);
};

IsIgnored = function (path, watch) {
	this.path = path;
	this.dirname = dirname(path);
	this.watch = watch;
};

IsIgnored.prototype = {
	init: function () {
		if (this.globalRules && this.globalRules.length &&
			 applyGlobalRules(this.path, this.globalRules)) {
			return deferred(true);
		}
		if (this.getMap.length > 1) {
			return this.promise = deferred.map(this.getMap, this.initMap, this)(
				function (result) {
					this.maps = result.map(parse);
					return this.calculate();
				}.bind(this)
			);
		} else {
			return this.promise = this.initMap(this.getMap[0], 0)(function (result) {
				this.maps = [parse(result)];
				return this.calculate();
			}.bind(this));
		}
	},
	initMap: function (getMap, index) {
		var map = getMap(this.dirname);
		if (this.watch) {
			map.on('change', function (map) {
				var nvalue;
				if (this.promise.resolved && !this.promise.failed) {
					this.maps[index] = parse(map);
					nvalue = this.calculate();
					if (this.promise.value === nvalue) {
						return;
					}
					this.promise.value = nvalue;
					this.promise.emit('change', nvalue, this.path);
				}
			}.bind(this));
		}
		return map;
	},
	calculate: function () {
		var current, data = {}, result = false, paths = [];

		// Merge rules found in ignorefiles
		this.maps.forEach(function (map) {
			forEach(map.map, function (rules, path) {
				if (!rules.length) {
					return;
				}
				if (!data[path]) {
					paths.push(path);
					data[path] = [];
				}
				data[path].push(rules);
			});
		});
		if (!paths) {
			// No rules found
			return false;
		}

		// Apply rules
		current = this.path;
		paths.sort().some(function (rulesPath) {
			if (rulesPath.length > this.dirname.length) {
				return true;
			}
			data[rulesPath].forEach(function (rules) {
				var data = applyRules(rules, rulesPath, current);
				if ((data.value === false) && (current !== path)) {
					data = applyRules(rules, rulesPath, this.path);
				}
				if ((data.target !== current) || (data.value != null)) {
					result = data.value;
				}
				current = data.target;
			}, this);
		}, this);
		return Boolean(result);
	}
};

module.exports = isIgnored = function (mode, path) {
	var options, cb, watch, globalRules, isIgnored;
	path = resolve(String(path));
	if (isArray(mode)) {
		mode.forEach(function (mode) {
			if (!modes[mode]) {
				throw new Error("Unknown mode '" + mode + "'");
			}
		});
	} else if (mode) {
		if (!modes[mode]) {
			throw new Error("Unknown mode '" + mode + "'");
		}
		mode = [mode];
	}

	options = Object(arguments[2]);
	cb = arguments[3];
	if (!cb) {
		if (isCallable(options)) {
			cb = options;
			options = {};
		}
	}

	if (options.globalRules != null) {
		globalRules = isArray(options.globalRules) ? options.globalRules :
			String(options.globalRules).split(eolRe);
		globalRules = compact.call(globalRules.map(trim)).reverse();
		if (applyGlobalRules(path, globalRules)) {
			return deferred(true).cb(cb);
		}
	}

	if (!mode) {
		return deferred(false).cb(cb);
	}

	watch = options.watch;
	isIgnored = new IsIgnored(path, watch);
	isIgnored.getMap = [];
	isIgnored.globalRules = [];
	mode.forEach(function (name) {
		var mode = modes[name];
		isIgnored.getMap.push(function (path) {
			return getMap(path, mode, watch);
		});
		if (mode.globalRules) {
			push.apply(isIgnored.globalRules, mode.globalRules);
		}
	});
	return isIgnored.init();
};
isIgnored.IsIgnored = IsIgnored;
