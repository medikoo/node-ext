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

  , applyRules, minimatchOpts, isIgnored, calculate, applyGlobalRules;

minimatchOpts = { matchBase: true };

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

calculate = function (path, maps) {
	var current, data = {}, result = false, paths = [];

	// Prepare rules found in ignorefiles
	maps.forEach(function (map) {
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
	current = path;
	paths.sort().some(function (rulesPath) {
		if (rulesPath.length >= current.length) {
			return true;
		}
		data[rulesPath].forEach(function (rules) {
			var data = applyRules(rules, rulesPath, current);
			if ((data.value === false) && (current !== path)) {
				data = applyRules(rules, rulesPath, path);
			}
			if ((data.target !== current) || (data.value != null)) {
				result = data.value;
			}
			current = data.target;
		});
	});
	return Boolean(result);
};

isIgnored = memoize.call(function (filename, mode) {
	var promise, maps, path, recalculate, value, parseMap;

	mode = mode.split(',');
	path = dirname(filename);

	parseMap = function (map) {
		map = copy(map);
		map.map = omap(map.map, function (str) {
			return compact.call(String(str).split(eolRe).map(trim)).reverse();
		});
		return map;
	};

	recalculate = function () {
		var nvalue, ovalue;
		ovalue = promise.valueOf();
		if (!isBoolean(ovalue)) {
			return;
		}
		nvalue = calculate(filename, maps);
		if (ovalue === nvalue) {
			return;
		}
		promise.value = nvalue;
		promise.emit('change', nvalue);
	};

	promise = deferred.map(mode, function (mode, index) {
		var map = getMap(path, modes[mode]);
		map.on('change', function (map) {
			if (maps) {
				maps[index] = parseMap(map);
				recalculate();
			}
		});
		return map;
	}).map(parseMap)(function (result) {
		maps = result;
		return calculate(filename, maps);
	});

	return promise;
}, { primitive: true });

applyGlobalRules = function (path, rules) {
	var value;

	// Check global rules
	value = applyRules(rules, path.slice(0, path.indexOf(sep) + 1), path);
	if (value.value === true) {
		return deferred(value.value);
	}
};

module.exports = function (mode, path) {
	var globalRules = [], cb, arg, value;
	path = resolve(String(path));
	if (isArray(mode)) {
		mode = String(mode.map(function (mode) {
			mode = String(mode);
			if (!modes[mode]) {
				throw new Error("Unknown mode '" + mode + "'");
			}
			if (modes[mode].globalRules) {
				push.apply(globalRules, modes[mode].globalRules);
			}
			return mode;
		}));
	} else if (mode) {
		if (!modes[mode]) {
			throw new Error("Unknown mode '" + mode + "'");
		} else if (modes[mode].globalRules) {
			push.apply(globalRules, modes[mode].globalRules);
		}
	}

	arg = arguments[2];
	if (arg) {
		if (isCallable(arg)) {
			cb = arg;
		} else {
			cb = arguments[3];
			arg = arg.globalRules;
			if (arg != null) {
				push.apply(globalRules, isArray(arg) ? arg : String(arg).split(eolRe));
			}
		}
	}

	if (globalRules.length) {
		value = applyGlobalRules(path,
			compact.call(globalRules.map(trim)).reverse());
		if (value) {
			return value;
		}
	}

	return mode ? isIgnored(path, mode).cb(cb) : deferred(false).cb(cb);
};
