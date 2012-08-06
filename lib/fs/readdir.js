'use strict';

var isArray         = Array.isArray
  , push            = Array.prototype.push
  , i               = require('es5-ext/lib/Function/i')
  , curry           = require('es5-ext/lib/Function/prototype/curry')
  , compact         = require('es5-ext/lib/Array/prototype/compact')
  , contains        =
	curry.call(require('es5-ext/lib/Array/prototype/contains'))
  , diff            = require('es5-ext/lib/Array/prototype/diff')
  , flatten         = require('es5-ext/lib/Array/prototype/flatten')
  , remove          = require('es5-ext/lib/Array/prototype/remove')
  , extend          = require('es5-ext/lib/Object/extend')
  , forEach         = require('es5-ext/lib/Object/for-each')
  , isCallable      = require('es5-ext/lib/Object/is-callable')
  , isCopy          = require('es5-ext/lib/Object/is-copy')
  , toUint          = require('es5-ext/lib/Number/to-uint')
  , memoize         = require('memoizee')
  , deferred        = require('deferred')
  , promisify       = deferred.promisify
  , fs              = require('fs')
  , path            = require('path')
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

Readdir = function () {};
Readdir.prototype = {
	init: function () {
		var data, result, promise, emptyArr, progressEvents;
		progressEvents = this.progressEvents
		data = this.read(this.path, this.depth);
		if (!this.depth) {
			if (this.progressEvents) {
				data.files.aside(function (files) {
					promise.emit('change', { data: files, added: files, removed: [] });
				});
			}
			return data.files;
		}
		result = [];
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
			var getPath, files, dirs;
			if (root) {
				getPath = function (path) { return root + path; };
				files = data.files.aside(function (files) {
					if (files.length) {
						files = files.map(getPath);
						push.apply(result, files);
						if (promise.resolved || progressEvents) {
							promise.emit('change', { data: result, removed: [], added: files });
						}
					}
					return files;
				});
			} else {
				files = data.files.aside(function (files) {
					if (files.length) {
						push.apply(result, files);
						if (promise.resolved || progressEvents) {
							promise.emit('change', { data: result, removed: [], added: files });
						}
					}
					return files;
				});
			}
			if (this.watch) {
				if (root) {
					data.files.on('end', function (files) {
						if (files.length) {
							files = files.map(getPath);
							remove.apply(result, files);
							if (promise.resolved || progressEvents) {
								promise.emit('change', { data: result, removed: files, added: [] });
							}
						}
					});
				}
				data.files.on('change', function (data) {
					var removed, added;
					removed = root ? data.removed.map(getPath) : data.removed;
					added = root ? data.added.map(getPath) : data.added;
					remove.apply(result, removed);
					push.apply(result, added);
					if (promise.resolved || progressEvents) {
						promise.emit('change', { data: result, removed: removed, added: added });
					}
				});
			}

			if (data.dirs) {
				if (this.watch) {
					data.dirs.on('change', function (data) {
						deferred.map(data.added, function (dir) {
							return self.call(this,
								this.read(this.path + sep + root + dir, depth),
								root + dir + sep, depth - 1);
						}, this).end();
					}.bind(this));
				}
				return deferred(files(null, emptyArr), data.dirs(null, emptyArr).map(function (dir) {
					return self.call(this,
						this.read(this.path + sep + root + dir, depth - 1),
						root + dir + sep, depth - 1);
				}, this));
			}
			return files;
		}.call(this, data, '', this.depth))
			.end(this.resolve.bind(this, result));

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
		if (this.isIgnored) {
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
				return pLstat(fullPath).aside(function (stat) {
					var type = getTypeFromStat(stat);
					if (files && (!this.type || this.type[type]) &&
							(!this.pattern || !getDirs || this.pattern.test(fullPath))) {
						files.push(path);
					}
					if (dirs && (type === 'directory')) {
						dirs.push(path);
					}
				}.bind(this));
			}.bind(this);

			paths.on('change', function (data) {
				var removed, nFiles, nDirs;
				if (data.added.length) {
					nFiles = files && [];
					nDirs = getDirs && [];
				}
				deferred.map(data.added, function (path) {
					return test(path, nFiles, nDirs);
				}).end(function () {
					if (files) {
						removed = data.removed.filter(contains, files);
						if (removed.length || (nFiles && nFiles.length)) {
							remove.apply(files, removed);
							if (nFiles) {
								push.apply(files, nFiles);
							}
							result.files.emit('change',
								{ data: files, removed: removed, added: nFiles || [] });
						}
					}
					if (getDirs) {
						removed = data.removed.filter(contains, dirs);
						if (removed.length || (nDirs && nDirs.length)) {
							remove.apply(dirs, removed);
							if (nDirs) {
								push.apply(dirs, nDirs);
							}
							result.dirs.emit('change',
								{ data: dirs, removed: removed, added: nDirs || [] });
						}
					}
				});
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
				var removed, added;
				removed = data.removed.filter(contains, result);
				added = data.added.filter(filter);
				if (removed.length || added.length) {
					remove.apply(result, removed);
					push.apply(result, added);
					promise.emit('change', { data: result, removed: removed, added: added });
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
						promise.emit('change', { data: result, removed: [path], added: [] });
					} else {
						result.push(path);
						promise.emit('change', { data: result, removed: [], added: [path] });
					}
				};
				status.on('change', listeners[path] = listener);
			}
			status.end(cb);
		}.bind(this);

		if (this.watch) {
			promises = {};
			listeners = {};

			paths.on('change', function (data) {
				var removed, added = [], waiting = data.added.length, onEnd;
				data.removed.forEach(function (path) {
					promises[path].off('change', listeners[path]);
					delete listeners[path];
					delete promises[path];
				});
				removed = data.removed.filter(contains, result);
				onEnd = function () {
					if (removed.length || added.length) {
						remove.apply(result, removed);
						push.apply(result, added);
						promise.emit('change', { data: result, removed: removed, added: added });
					}
				};
				if (!waiting) {
					onEnd();
					return;
				}
				data.added.forEach(function (path) {
					test(path, function (isIgnored) {
						if (!isIgnored) {
							added.push(path);
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
					var removed, added;
					if (err) {
						promise.emit('end', files);
						promise.allOff();
						return;
					}
					removed = diff.call(files, data);
					added = diff.call(data, files);
					if (removed.length || added.length) {
						remove.apply(files, removed);
						push.apply(files, added);
						promise.emit('change', { data: files, removed: removed, added: added });
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
			var mode = ignoreModes[name], isRoot, readRules;
			if (!mode) {
				throw new Error("Unknown mode '" + name + "'");
			}
			isRoot = memoize(watch ? mode.isRootWatch : mode.isRoot);
			readRules = memoize(watch ? getConfFileMap.readRulesWatch :
				getConfFileMap.readRules);
			iGetMap.push(function (path) {
				var map, finder;
				map = new ConfMap(path, watch);
				map.filename = mode.filename;
				map.readRules = readRules;
				map.parse = isIgnored.parseSrc;
				finder = new FindRoot(path, watch);
				finder.isRoot = isRoot;
				finder.next();
				return map.init(finder.promise);
			});
			if (mode.globalRules) {
				push.apply(globalRules, mode.globalRules);
			}
		});
		if (!globalRules.length) {
			globalRules = null;
		}
		buildMap = memoize(function (dirname) {
			return iBuildMap(dirname, iGetMap, watch);
		});
	}

	if (globalRules) {
		globalRules = prepareRules(globalRules);
	}

	readdir = new Readdir();
	readdir.path = path;
	readdir.depth = isNaN(options.depth) ? 0 : toUint(options.depth);
	readdir.type = (options.type != null) ? Object(options.type) : null;
	readdir.pattern = (options.pattern != null) ? RegExp(options.pattern) : null;
	readdir.globalRules = globalRules;
	readdir.watch = watch;
	readdir.progressEvents = Boolean(options.progressEvents);

	if (ignoreRules) {
		readdir.isIgnored = function (path) {
			var isIgnored;
			isIgnored = new IsIgnored(path, watch);
			return isIgnored.init(buildMap(isIgnored.dirname));
		};
	}

	return readdir.init().cb(cb);
};
