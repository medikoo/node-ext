'use strict';

var isArray         = Array.isArray
  , push            = Array.prototype.push
  , fs              = require('fs')
  , deferred        = require('deferred')
  , promisify       = deferred.promisify
  , resolve         = require('path').resolve
  , readdir         = promisify(fs.readdir)
  , curry           = require('es5-ext/lib/Function/prototype/curry')
  , compact         = require('es5-ext/lib/Array/prototype/compact')
  , contains        = curry.call(require('es5-ext/lib/Array/prototype/contains'))
  , diff            = require('es5-ext/lib/Array/prototype/diff')
  , flatten         = require('es5-ext/lib/Array/prototype/flatten')
  , remove          = require('es5-ext/lib/Array/prototype/remove')
  , memoize         = require('es5-ext/lib/Function/prototype/memoize')
  , d               = require('es5-ext/lib/Object/descriptor')
  , forEach         = require('es5-ext/lib/Object/for-each')
  , isCallable      = require('es5-ext/lib/Object/is-callable')
  , isCopy          = require('es5-ext/lib/Object/is-copy')
  , toUint          = require('es5-ext/lib/Number/to-uint')
  , sep             = require('../path/sep')
  , ignoreModes     = require('./_ignorefile-modes')
  , getTypeFromStat = require('./get-type-from-stat')
  , isIgnored       = require('./is-ignored')
  , lstat           = fs.lstat
  , pLstat          = promisify(lstat)
  , watchPath       = require('./watch')

  , toFullPath, read, readDeep, filterByType, filterByPattern, filterIgnored
  , getType, dirType, getTypesMap;

toFullPath = function (name) {
	return this + sep + name;
};

read = memoize.call(function (root, watch) {
	var promise, result, watcher;
	promise = readdir(root)(function (data) {
		return (result = data);
	});

	if (watch) {
		watcher = watchPath(root);
		watcher.on('end', function () {
			promise.emit('end', result);
			read.clearCache(root);
			promise.allOff();
		});
		watcher.on('change', function () {
			readdir(root).end(function (data) {
				var old, neew;
				old = diff.call(result, data);
				neew = diff.call(data, result);
				if (old.length || neew.length) {
					remove.apply(result, old);
					push.apply(result, neew);
					promise.emit('change', { data: result, old: old, new: neew });
				}
			}, null);
		});
	} else {
		read.preventCache = true;
	}
	promise.root = root;
	return promise;
}, { length: 1 });

getTypesMap = function (paths) {
	var root = paths.root, def = deferred(), result = {}
	  , erroed;
	paths.end(function (paths) {
		var waiting = paths.length;
		if (!waiting) {
			def.resolve(result);
			return;
		}
		paths.forEach(function (path) {
			lstat(root + sep + path, function (err, stat) {
				if (erroed) {
					return;
				}
				if (err) {
					def.resolve(err);
					erroed = true;
					return;
				}
				try {
					result[path] = getTypeFromStat(stat);
				} catch (e) {
					def.resolve(e);
					erroed = true;
				}
				if (!--waiting) {
					def.resolve(result);
				}
			});
		});
	}, d.resolve);
	return def.promise;
};

filterByType = function (paths, types, map, watch) {
	var promise, result, test, root = paths.root;

	if (watch) {
		test = function (path) {
			return pLstat(root + sep + path)(function (stat) {
				return types[getTypeFromStat(stat)] ? path : null;
			});
		};

		paths.on('change', function (data) {
			var old, neew;
			old = data.old.filter(contains, result);
			deferred.map(data.new, test).end(function (neew) {
				neew = compact.call(neew);
				if (old.length || neew.length) {
					remove.apply(result, old);
					push.apply(result, neew);
					promise.emit('change', { data: result, old: old, new: neew });
				}
			}, null);
		});

		paths.on('end', function () {
			promise.emit('end', result);
			promise.allOff();
		});
	}
	promise = deferred(paths, map)(function (data) {
		return (result = data[0].filter(function (path) {
			return types[this[path]];
		}, data[1]));
	});
	promise.root = root;
	return promise;
};

filterByPattern = function (paths, pattern, watch) {
	var promise, result, root = paths.root;
	if (watch) {
		paths.on('change', function (data) {
			var old, neew;
			old = data.old.filter(contains, result);
			neew = data.new.filter(function (path) {
				return pattern.test(root + sep + path);
			});
			if (old.length || neew.length) {
				remove.apply(result, old);
				push.apply(result, neew);
				promise.emit('change', { data: result, old: old, new: neew });
			}
		});
		paths.on('end', function () {
			promise.emit('end', result);
			promise.allOff();
		});
	}
	promise = paths(function (data) {
		return (result = data.filter(function (path) {
			return pattern.test(root + sep + path);
		}));
	});
	promise.root = root;
	return promise;
};

filterIgnored = function (paths, rules, watch) {
	var promise, result, test, listener, listeners, root = paths.root;

	test = function (path) {
		var status = isIgnored(rules, root + sep + path);
		if (watch) {
			status.on('change', listeners[path] = listener.bind(path));
		}
		return status(function (isIgnored) {
			return isIgnored ? null : path;
		});
	};

	if (watch) {
		listeners = {};

		listener = function (value) {
			if (value) {
				remove.call(result, this);
				promise.emit('change', { data: result, old: [this], new: [] });
			} else {
				result.push(this);
				promise.emit('change', { data: result, old: [], new: [this] });
			}
		};

		paths.on('change', function (data) {
			var old, neew;
			data.old.forEach(function (path) {
				isIgnored(rules, root + sep + path).off('change', listeners[path]);
				delete listeners[path];
			});
			old = data.old.filter(contains, result);
			deferred.map(data.new, test).end(function (neew) {
				neew = compact.call(neew);
				if (old.length || neew.length) {
					remove.apply(result, old);
					push.apply(result, neew);
					promise.emit('change', { data: result, old: old, new: neew });
				}
			}, null);
		});

		paths.on('end', function () {
			promise.emit('end', result);
			forEach(listeners, function (listener, path) {
				isIgnored(rules, root + sep + path).off('change', listener);
			});
			promise.allOff();
		});
	}

	promise = paths.map(test)(function (data) {
		return (result = compact.call(data));
	});
	promise.root = root;
	return promise;
};


readDeep = function (path, depth, type, pattern, ignoreRules, watch) {
	var result = [], promise, dirPaths, paths, validate, addDir, removeDir
	  , listeners, typesMap, isTypeDirType;
	paths = dirPaths = read(path, watch);

	if (!type && !pattern && !ignoreRules && !depth) {
		paths.end(function (err, data) {
			if (data) {
				data.sort();
			}
		});
		if (watch) {
			paths.on('change', function (data) {
				data.data.sort();
			});
		}
		return paths;
	}
	if (type) {
		typesMap = getTypesMap(paths);
		paths = filterByType(paths, type, typesMap, watch);
		if ((isTypeDirType = isCopy(dirType, type))) {
			dirPaths = paths;
		}
	}
	if (pattern) {
		paths = filterByPattern(paths, pattern, watch);
	}
	if (ignoreRules) {
		paths = filterIgnored(paths, ignoreRules, watch);
	}
	if (watch) {
		paths.on('change', function (data) {
			remove.apply(result, data.old);
			push.apply(result, data.new);
			result.sort();
			promise.emit('change', { data: result, old: data.old, new: data.new });
		});
		paths.on('end', function () {
			promise.emit('end', result);
			promise.allOff();
		});
	}
	promise = paths(function (paths) {
		push.apply(result, paths);
		return result;
	});

	if (depth) {
		if (!isTypeDirType) {
			dirPaths = filterByType(dirPaths, dirType,
				typesMap || getTypesMap(dirPaths), watch);
		}
		if (ignoreRules) {
			dirPaths = filterIgnored(dirPaths, ignoreRules, watch);
		}
		addDir = function (subPath) {
			var listener, data = readDeep(path + sep + subPath, depth - 1, type,
				pattern, ignoreRules, watch);
			if (watch) {
				data.on('change', listener = function (data) {
					var old, neew;
					old = data.old.map(toFullPath, subPath);
					neew = data.new.map(toFullPath, subPath);
					remove.apply(result, old);
					push.apply(result, neew);
					result.sort();
					promise.emit('change', { data: result, old: old, new: neew });
				});
				listeners[subPath] = { data: data, listener: listener };
			}
			return data(function (data) {
				data = data.map(toFullPath, subPath);
				push.apply(result, data);
				return data;
			});
		};
		if (watch) {
			listeners = {};
			removeDir = function (subPath) {
				var listener = listeners[subPath];
				listener.data.off('change', listener.listener);
				delete listeners[subPath];
				return listener.data(function (old) {
					old = old.map(toFullPath, subPath);
					remove.apply(result, old);
					return old;
				});
			};
			dirPaths.on('change', function (data) {
				deferred(deferred.map(data.old, removeDir),
					deferred.map(data.new, addDir)).end(function (data) {
						var old, neew;
						old = flatten.call(data[0]);
						neew = flatten.call(data[1]);
						if (old.length || neew.length) {
							result.sort();
							promise.emit('change', { data: result, old: old, new: neew });
						}
					}, null);
			});
		}
		promise = deferred(promise, dirPaths.map(addDir))(result.sort.bind(result,
			undefined));
	}
	return promise;
};

dirType = { directory: true };

module.exports = function (path) {
	var options, cb, depth, type, pattern, ignoreRules;
	path = resolve(String(path));
	if (isCallable(arguments[1])) {
		options = {};
		cb = arguments[1];
	} else {
		options = Object(arguments[1]);
		cb = arguments[2];
	}
	depth = isNaN(options.depth) ? 0 : toUint(options.depth);
	type = (options.type != null) ? Object(options.type) : null;
	pattern = (options.pattern != null) ? RegExp(options.pattern) : null;
	if (options.ignoreRules) {
		ignoreRules = options.ignoreRules;
		if (isArray(ignoreRules)) {
			ignoreRules.forEach(function (mode) {
				if (!ignoreModes[mode]) {
					throw new Error("Unknown mode '" + mode + "'");
				}
			});
		} else if (!ignoreModes[ignoreRules]) {
			throw new Error("Unknown mode '" + ignoreRules + "'");
		}
	}

	return readDeep(path, depth, type, pattern, ignoreRules,
		Boolean(options.watch)).cb(cb);
};
