'use strict';

var isArray         = Array.isArray
  , push            = Array.prototype.push
  , defineProperty  = Object.defineProperty
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
  , toUint          = require('es5-ext/lib/Number/to-uint')
  , ee              = require('event-emitter')
  , sep             = require('../path/sep')
  , ignoreModes     = require('./_ignorefile-modes')
  , getTypeFromStat = require('./get-type-from-stat')
  , isIgnored       = require('./is-ignored')
  , lstat           = fs.lstat
  , pLstat          = promisify(lstat)
  , watch           = require('./watch')

  , toFullPath, read, readDeep, filterByType, filterByPattern, filterIgnored
  , getType, getPattern, dirType;

toFullPath = function (name) {
	return this + sep + name;
};

read = memoize.call(function (root) {
	var promise, result, watcher;
	promise = ee(readdir(root)(function (data) {
		return (result = data);
	}));

	watcher = watch(root);
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
	return defineProperty(promise, 'root', d(root));
});

filterByType = memoize.call(function (paths, types) {
	var promise, result, test, root = paths.root;
	test = function (path) {
		return pLstat(root + sep + path)(function (stat) {
			return contains.call(types, getTypeFromStat(stat)) ? path : null;
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
		filterByType.clearCache(paths, types);
		promise.allOff();
	});
	promise = ee(paths.map(test)(function (data) {
		return (result = compact.call(data));
	}));
	return defineProperty(promise, 'root', d(root));
});

filterByPattern = memoize.call(function (paths, pattern) {
	var promise, result, root = paths.root;
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
		filterByPattern.clearCache(paths, pattern);
		promise.allOff();
	});
	promise = ee(paths(function (data) {
		return (result = data.filter(function (path) {
			return pattern.test(root + sep + path);
		}));
	}));
	return defineProperty(promise, 'root', d(root));
});

filterIgnored = memoize.call(function (paths, rules) {
	var promise, result, test, listener, listeners = {}, root = paths.root;

	rules = rules.split(',');
	listener = function (value) {
		if (value) {
			remove.call(result, this);
			promise.emit('change', { data: result, old: [this], new: [] });
		} else {
			result.push(this);
			promise.emit('change', { data: result, old: [], new: [this] });
		}
	};
	test = function (path) {
		var status = isIgnored(rules, root + sep + path);
		status.on('change', listeners[path] = listener.bind(path));
		return status(function (isIgnored) {
			return isIgnored ? null : path;
		});
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
		filterIgnored.clearCache(paths, rules);
		forEach(listeners, function (listener, path) {
			isIgnored(rules, root + sep + path).off('change', listener);
		});
		promise.allOff();
	});
	promise = ee(paths.map(test)(function (data) {
		return (result = compact.call(data));
	}));
	return defineProperty(promise, 'root', d(root));
});


readDeep = memoize.call(function (path, depth, type, pattern, ignoreRules) {
	var result = [], promise, dirPaths, paths, validate, addDir, removeDir
	  , listeners = {};
	paths = dirPaths = read(path);

	if (!type && !pattern && !ignoreRules && !depth) {
		paths.end(function (err, data) {
			if (data) {
				data.sort();
			}
		});
		paths.on('change', function (data) {
			data.data.sort();
		});
		paths.on('end', function () {
			readDeep.clearCache(path, depth, type, pattern, ignoreRules);
		});
		return paths;
	}
	if (type) {
		paths = filterByType(paths, type);
	}
	if (pattern) {
		paths = filterByPattern(paths, pattern);
	}
	if (ignoreRules) {
		paths = filterIgnored(paths, ignoreRules);
	}
	paths.on('change', function (data) {
		remove.apply(result, data.old);
		push.apply(result, data.new);
		result.sort();
		promise.emit('change', { data: result, old: data.old, new: data.new });
	});
	paths.on('end', function () {
		promise.emit('end', result);
		readDeep.clearCache(path, depth, type, pattern, ignoreRules);
		promise.allOff();
	});
	promise = paths(function (paths) {
		push.apply(result, paths);
		return result;
	});

	if (depth) {
		dirPaths = filterByType(dirPaths, dirType);
		if (ignoreRules) {
			dirPaths = filterIgnored(dirPaths, ignoreRules);
		}
		addDir = function (subPath) {
			var listener, data = readDeep(path + sep + subPath, depth - 1, type,
				pattern, ignoreRules);
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
			return data(function (data) {
				data = data.map(toFullPath, subPath);
				push.apply(result, data);
				return data;
			});
		};
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
		promise = promise(dirPaths.map(addDir))(result.sort.bind(result,
			undefined));
	}
	return ee(promise);
});

getType = memoize.call(function (file, directory, blockDevice, characterDevice,
	symbolicLink, fifo, socket) {
	var result = [];
	if (file) {
		result.push('file');
	}
	if (directory) {
		result.push('directory');
	}
	if (blockDevice) {
		result.push('blockDevice');
	}
	if (characterDevice) {
		result.push('characterDevice');
	}
	if (symbolicLink) {
		result.push('symbolicLink');
	}
	if (fifo) {
		result.push('FIFO');
	}
	if (socket) {
		result.push('socket');
	}
	return result.length ? result : null;
});

dirType = getType(false, true, false, false, false, false, false);

getPattern = memoize.call(function (pattern) {
	return getPattern.args[0];
}, { resolvers: [String] });

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
	if (options.type != null) {
		type = options.type;
		type = getType(Boolean(type.file), Boolean(type.directory),
			Boolean(type.blockDevice), Boolean(type.characterDevice),
			Boolean(type.symbolicLlink), Boolean(type.FIFO), Boolean(type.socket));
	} else {
		type = null;
	}
	pattern = (options.pattern != null) ? getPattern(RegExp(options.pattern)) :
		null;
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
		ignoreRules = String(ignoreRules);
	}

	return readDeep(path, depth, type, pattern, ignoreRules).cb(cb);
};
