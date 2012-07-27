'use strict';

var isArray         = Array.isArray
  , push            = Array.prototype.push
  , fs              = require('fs')
  , deferred        = require('deferred')
  , promisify       = deferred.promisify
  , path            = require('path')
  , i               = require('es5-ext/lib/Function/i')
  , curry           = require('es5-ext/lib/Function/prototype/curry')
  , compact         = require('es5-ext/lib/Array/prototype/compact')
  , contains        =
	curry.call(require('es5-ext/lib/Array/prototype/contains'))
  , diff            = require('es5-ext/lib/Array/prototype/diff')
  , flatten         = require('es5-ext/lib/Array/prototype/flatten')
  , remove          = require('es5-ext/lib/Array/prototype/remove')
  , memoize         = require('es5-ext/lib/Function/prototype/memoize')
  , extend          = require('es5-ext/lib/Object/extend')
  , forEach         = require('es5-ext/lib/Object/for-each')
  , isCallable      = require('es5-ext/lib/Object/is-callable')
  , isCopy          = require('es5-ext/lib/Object/is-copy')
  , toUint          = require('es5-ext/lib/Number/to-uint')
  , sep             = require('../path/sep')
  , getConfFileMap  = require('./_get-conf-file-map')
  , ignoreModes     = require('./_ignorefile-modes')
  , getTypeFromStat = require('./get-type-from-stat')
  , FindRoot        = require('./find-root').FindRoot
  , isIgnored       = require('./is-ignored')
  , watchPath       = require('./watch')

  , dirname = path.dirname, resolve = path.resolve
  , readdir = fs.readdir, lstat = fs.lstat, pLstat = promisify(lstat)

  , ConfMap = getConfFileMap.Map
  , IsIgnored = isIgnored.IsIgnored, iBuildMap = isIgnored.buildMap
  , applyGlobalRules = isIgnored.applyGlobalRules
  , prepareRules = isIgnored.prepareRules

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/

  , Readdir;

Readdir = function (path, depth, type, pattern, globalRules, ignoreRules, watch) {
	this.path = path;
	this.depth = depth;
	this.type = type;
	this.pattern = pattern;
	this.globalRules = globalRules;
	this.ignoreRules = ignoreRules;
	this.watch = watch;
};
Readdir.prototype = {
	init: function () {
		var data, result, promise, emptyArr;
		data = this.read(this.path, this.depth);
		if (!this.depth) {
			return data.files;
		}
		extend(this, deferred());
		promise = this.promise;

		data.files.end(null, this.resolve);
		if (this.watch) {
			data.files.on('end', function () {
				if (!promise.resolved) {
					this.resolve(new Error("Directory was removed"));
					return;
				}
				promise.emit('end', result);
				promise.allOff();
			}.bind(this));
		}

		emptyArr = [];

		(function self(data, root, depth) {
			var getPath, files, dirs, lResult;
			if (root) {
				getPath = function (path) { return root + path; };
				files = data.files(function (files) {
					lResult = files.map(getPath);
					return lResult;
				}, emptyArr);
			} else {
				files = data.files(function (data) {
					return lResult = data;
				}, emptyArr);
			}
			if (this.watch) {
				if (root) {
					data.files.on('end', function (files) {
						if (files.length) {
							files = files.map(getPath);
							remove.apply(result || lResult, files);
							if (result) {
								promise.emit('change', { data: result, old: files, new: [] });
							}
						}
					});
				}
				data.files.on('change', function (data) {
					var old, neew;
					old = root ? data.old.map(getPath) : data.old;
					neew = root ? data.new.map(getPath) : data.new;
					remove.apply(result || lResult, old);
					push.apply(result || lResult, neew);
					if (result) {
						promise.emit('change', { data: result, old: old, new: neew });
					}
				});
			}

			if (data.dirs) {
				dirs = data.dirs(i, emptyArr)
				if (this.watch) {
					data.dirs.on('change', function (data) {
						deferred.map(data.new, function (dir) {
							return self.call(this,
								this.read(this.path + sep + root + dir, depth),
								root + dir + sep, depth - 1);
						}, this).end(function (data) {
							data = flatten.call(data);
							if (data.length) {
								push.apply(result || lResult, data);
								if (result) {
									promise.emit('change', { data: result, old: [], new: data });
								}
							}
						}, this.resolve);
					}.bind(this));
				}
				return deferred(files, dirs.map(function (dir) {
					return self.call(this,
						this.read(this.path + sep + root + dir, depth - 1),
						root + dir + sep, depth - 1);
				}, this));
			}
			return files;
		}.call(this, data, '', this.depth)).end(function (data) {
			this.resolve(result = flatten.call(data));
		}.bind(this), null);

		return this.promise;
	},
	read: function (path, getDirs) {
		var result, promise, dirPaths, paths, validate, addDir, removeDir
		  , listeners, typesMap, isTypeDirType, data;

		paths = this.readdir(path);

		if (this.type || getDirs) {
			data = this.filterByType(paths, getDirs);
			paths = data.files;
			dirPaths = data.dirs;
		} else if (this.pattern || this.globalRules) {
			paths = this.filterByPattern(paths);
		}
		if (this.ignoreRules) {
			if (dirPaths && (dirPaths !== paths)) {
				dirPaths = this.filterIgnored(dirPaths);
				paths = this.filterIgnored(paths);
			} else {
				paths = this.filterIgnored(paths);
				if (dirPaths) {
					dirPaths = paths;
				}
			}
		}

		return { files: paths, dirs: dirPaths };
	},
	filterByType: function (paths, getDirs) {
		var promise, result = {}, test, root = paths.root
		  , files, dirs, resolve, defFiles, defDirs;

		if (this.type || this.pattern || this.globalRules) {
			files = [];
			defFiles = deferred();
			result.files = defFiles.promise;
			result.files.root = root;
		} else {
			result.files = paths;
		}
		if (getDirs) {
			if (this.type && isCopy(this.type, { directory: true }) && !this.pattern) {
				dirs = files;
				result.dirs = result.files;
				getDirs = false;
			} else {
				dirs = [];
				defDirs = deferred();
				result.dirs = defDirs.promise
				result.dirs.root = root;
			}
		}

		resolve = function (e) {
			if (defFiles) {
				defFiles.resolve(e || files);
			}
			if (defDirs) {
				defDirs.resolve(e || dirs);
			}
		};

		paths.end(function (paths) {
			var waiting = paths.length, erroed;
			if (!waiting) {
				resolve();
				return;
			}
			paths.forEach(function (path) {
				var fullPath = root + sep + path;
				if ((!getDirs && this.pattern && !this.pattern.test(fullPath)) ||
						(this.globalRules &&
							applyGlobalRules(fullPath, this.globalRules))) {
					if (!--waiting) {
						resolve();
					}
					return;
				}
				lstat(fullPath, function (err, stat) {
					var type;
					if (erroed) {
						return;
					}
					if (err) {
						resolve(err);
						erroed = true;
						return;
					}
					try {
						type = getTypeFromStat(stat);
					} catch (e) {
						resolve(e);
						erroed = true;
						return;
					}
					if (files && (!this.type || this.type[type]) &&
							(!this.pattern || !getDirs || this.pattern.test(fullPath))) {
						files.push(path);
					}
					if (getDirs && (type === 'directory')) {
						dirs.push(path);
					}
					if (!--waiting) {
						resolve();
					}
				}.bind(this));
			}, this);
		}.bind(this), resolve);

		if (this.watch) {
			test = function (path, files, dirs) {
				var fullPath = root + sep + path;
				if ((!getDirs && this.pattern && !this.pattern.test(fullPath)) ||
						(this.globalRules &&
							applyGlobalRules(fullPath, this.globalRules))) {
					return null;
				}
				return pLstat(fullPath).cb(function (stat) {
					var type = getTypeFromStat(stat);
					if (files && (!this.type || this.type[type]) &&
							(!this.pattern || !getDirs || this.pattern.test(fullPath))) {
						files.push(path);
					}
					if (dirs && (type === 'directory')) {
						dirs.push(path);
					}
				}.bind(this), null);
			}.bind(this);

			paths.on('change', function (data) {
				var old, nFiles, nDirs;
				if (data.new.length) {
					nFiles = files && [];
					nDirs = getDirs && [];
				}
				deferred.map(data.new, function (path) {
					return test(path, nFiles, nDirs);
				}).end(function () {
					if (files) {
						old = data.old.filter(contains, files);
						if (old.length || (nFiles && nFiles.length)) {
							remove.apply(files, old);
							if (nFiles) {
								push.apply(files, nFiles);
							}
							result.files.emit('change',
								{ data: files, old: old, new: nFiles || [] });
						}
					}
					if (getDirs) {
						old = data.old.filter(contains, dirs);
						if (old.length || (nDirs && nDirs.length)) {
							remove.apply(dirs, old);
							if (nDirs) {
								push.apply(dirs, nDirs);
							}
							result.dirs.emit('change',
								{ data: dirs, old: old, new: nDirs || [] });
						}
					}
				}, null);
			});

			paths.on('end', function () {
				if (files) {
					result.files.emit('end', files);
					result.files.allOff();
				}
				if (getDirs) {
					result.dirs.emit('end', dirs);
					result.dirs.allOff();
				}
			});
		}
		return result;
	},
	filterByPattern: function (paths) {
		var promise, result, root = paths.root, pattern = this.pattern
		  , rules = this.globalRules, filter;

		filter = function (path) {
			var fullPath = root + sep + path;
			return ((!pattern || pattern.test(fullPath)) &&
				(!rules || !applyGlobalRules(fullPath, rules)));
		};

		if (this.watch) {
			paths.on('change', function (data) {
				var old, neew;
				old = data.old.filter(contains, result);
				neew = data.new.filter(filter);
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
			return (result = data.filter(filter));
		});
		promise.root = root;
		return promise;
	},
	filterIgnored: function (paths) {
		var promise, result, test, listener, listeners, root = paths.root
	    , promises, def = deferred();

		promise = def.promise;
		test = function (path, cb) {
			var status = this.isIgnored(root + sep + path);
			if (this.watch) {
				promises[path] = status;
				listener = function (value) {
					if (value) {
						remove.call(result, path);
						promise.emit('change', { data: result, old: [path], new: [] });
					} else {
						result.push(path);
						promise.emit('change', { data: result, old: [], new: [path] });
					}
				};
				status.on('change', listeners[path] = listener);
			}
			return status.end(cb, null);
		}.bind(this);

		if (this.watch) {
			promises = {};
			listeners = {};

			paths.on('change', function (data) {
				var old, neew = [], waiting = data.new.length, onEnd;
				data.old.forEach(function (path) {
					promises[path].off('change', listeners[path]);
					delete listeners[path];
					delete promises[path];
				});
				old = data.old.filter(contains, result);
				onEnd = function () {
					if (old.length || neew.length) {
						remove.apply(result, old);
						push.apply(result, neew);
						promise.emit('change', { data: result, old: old, new: neew });
					}
				};
				if (!waiting) {
					onEnd();
					return;
				}
				data.new.forEach(function (path) {
					test(path, function (isIgnored) {
						if (!isIgnored) {
							neew.push(path);
						}
						if (!--waiting) {
							onEnd();
						}
					});
				});
			});

			paths.on('end', function () {
				promise.emit('end', result);
				forEach(listeners, function (listener, path) {
					promises[path].off('change', listener);
					delete listeners[path];
					delete promises[path];
				});
				promise.allOff();
			});
		}

		paths.end(function (paths) {
			var waiting = paths.length;
			result = [];
			if (!waiting) {
				def.resolve(result);
				return;
			}
			paths.forEach(function (path) {
				test(path, function (isIgnored) {
					if (!isIgnored) {
						result.push(path);
					}
					if (!--waiting) {
						def.resolve(result);
					}
				});
			});
		}, def.resolve);
		promise.root = root;
		return promise;
	},
	readdir: function (path) {
		var def, promise, watcher, files;
		def = deferred();
		promise = def.promise;
		promise.root = path;
		if (this.watch) {
			try {
				watcher = watchPath(path);
			} catch (e) {
				return def.resolve(e);
			}
			watcher.on('end', function () {
				promise.emit('end', files);
				promise.allOff();
			});
			watcher.on('change', function () {
				readdir(path, function (err, data) {
					var old, neew;
					if (err) {
						promise.emit('end', files);
						promise.allOff();
						return;
					}
					old = diff.call(files, data);
					neew = diff.call(data, files);
					if (old.length || neew.length) {
						remove.apply(files, old);
						push.apply(files, neew);
						promise.emit('change', { data: files, old: old, new: neew });
					}
				});
			});
		}
		readdir(path, function (err, data) {
			if (err) {
				def.resolve(err);
				return;
			}
			def.resolve(files = data);
		}.bind(this));
		return promise;
	}
}

module.exports = function (path) {
	var options, cb, depth, type, pattern, ignoreRules, watch, readdir
	  , iGetMap, globalRules, buildMap;
	path = resolve(String(path));
	options = Object(arguments[1]);
	cb = arguments[2];
	if ((cb == null) && isCallable(options)) {
		options = {};
		cb = options;
	}

	watch = options.watch;

	if (options.globalRules) {
		globalRules = isArray(options.globalRules) ? options.globalRules :
			String(options.globalRules).split(eolRe);
	}

	if (options.ignoreRules) {
		ignoreRules = options.ignoreRules;
		iGetMap = [];
		if (!globalRules) {
			globalRules = [];
		}
		if (!isArray(ignoreRules)) {
			ignoreRules = [ignoreRules];
		}
		ignoreRules.forEach(function (name) {
			var mode = ignoreModes[name], isRoot, findRoot, readRules;
			if (!mode) {
				throw new Error("Unknown mode '" + name + "'");
			}
			isRoot = memoize.call(watch ? mode.isRootWatch : mode.isRoot);
			findRoot = function () {
				var finder = new FindRoot(this.path, watch);
				finder.isRoot = isRoot;
				finder.next();
				return finder.promise;
			};
			readRules = memoize.call(watch ? getConfFileMap.readRulesWatch :
				getConfFileMap.readRules);
			iGetMap.push(function (path) {
				var map = new ConfMap(path, watch);
				map.filename = mode.filename;
				map.findRoot = findRoot;
				map.readRules = readRules;
				return map.init();
			});
			if (mode.globalRules) {
				push.apply(globalRules, mode.globalRules);
			}
		});
		if (!globalRules.length) {
			globalRules = null;
		}
		buildMap = memoize.call(function (dirname) {
			return iBuildMap(dirname, iGetMap, watch);
		});
	}

	if (globalRules) {
		globalRules = prepareRules(globalRules);
	}

	readdir = new Readdir(path,
		isNaN(options.depth) ? 0 : toUint(options.depth),
		(options.type != null) ? Object(options.type) : null,
		(options.pattern != null) ? RegExp(options.pattern) : null,
		globalRules,
		Boolean(options.ignoreRules),
		watch);

	if (ignoreRules) {
		readdir.isIgnored = function (path) {
			var isIgnored;
			isIgnored = new IsIgnored(path, watch);
			isIgnored.getMap = function () {
				return buildMap(this.dirname);
			};
			return isIgnored.init();
		};
	}

	return readdir.init().cb(cb);
};
