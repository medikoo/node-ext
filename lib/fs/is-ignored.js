// Whether path is ignored by rule placed in .gitignore or
// similar file

'use strict';

var isArray   = Array.isArray
  , call      = Function.prototype.call
  , trim      = call.bind(String.prototype.trim)
  , path      = require('path')
  , promisify = require('deferred').promisify
  , readFile  = promisify(require('fs').readFile)
  , compact   = require('es5-ext/lib/Array/prototype/compact')
  , group     = require('es5-ext/lib/Array/prototype/group')
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , minimatch = require('minimatch')
  , watchOnce = require('./watch-once')

  , basename = path.basename, dirname = path.dirname, join = path.join
  , resolve = path.resolve

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/, getPattern, isIgnored;

getPattern = memoize.call(function (path, ignorefile) {
	var filename = join(path, ignorefile);
	return readFile(filename)(function (src) {
		var result;
		watchOnce(filename, getPattern.clearCache.bind(getPattern,
			path, ignorefile));
		result = group.call(compact.call(String(src).split(eolRe).map(trim)),
			function (item) {
				return (item[0] === '!') ? 'exclude' : 'include';
			});
		if (result.exclude) {
			result.exclude = result.exclude.map(function (pattern) {
				return pattern.slice(1);
			});
		}
		return result;
	}, function () {
		var parent;
		while (true) {
			try {
				watchOnce(path, getPattern.clearCache.bind(getPattern,
					path, ignorefile));
				break;
			} catch (e) {
				if ((parent = dirname(path)) === path) {
					getPattern.clearCache(path, ignorefile);
					break;
				}
				path = parent;
			}
		}
		return {};
	});
});

isIgnored = function (path, file, names) {
	return (function self(maps, index) {
		var parent;
		return maps[index](function (map) {
			if (map.exclude && map.exclude.some(function (pattern) {
				return minimatch(file, pattern, { matchBase: true });
			})) {
				return false;
			} else if (map.include && map.include.some(function (pattern) {
				return minimatch('/' + file, pattern, { matchBase: true });
			})) {
				return true;
			} else if (++index < maps.length) {
				return self(maps, index);
			} else if ((parent = dirname(path)) === path) {
				return false;
			} else {
				return isIgnored(parent, basename(path) + '/' + file, names);
			}
		});
	}(names.map(function (ignorefile) {
		return getPattern(path, ignorefile);
	}), 0));
};

module.exports = function (path, ignorefile, cb) {
	var parent, promise;

	path = resolve(String(path));
	ignorefile = isArray(ignorefile) ? ignorefile.map(String).reverse() :
		[String(ignorefile)];

	return isIgnored(dirname(path), basename(path), ignorefile).cb(cb);
};
