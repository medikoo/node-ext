// Whether path is ignored by rule placed in .gitignore or
// similar file

'use strict';

var isArray   = Array.isArray
  , unshift   = Array.prototype.unshift
  , call      = Function.prototype.call
  , trim      = call.bind(String.prototype.trim)
  , fs        = require('fs')
  , path      = require('path')
  , deferred  = require('deferred')
  , promisify = deferred.promisify
  , readFile  = promisify(fs.readFile)
  , lstat     = promisify(fs.lstat)
  , compact   = require('es5-ext/lib/Array/prototype/compact')
  , copy      = require('es5-ext/lib/Array/prototype/copy')
  , group     = require('es5-ext/lib/Array/prototype/group')
  , invoke    = require('es5-ext/lib/Function/invoke')
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , forEach   = require('es5-ext/lib/Object/for-each')
  , callable  = require('es5-ext/lib/Object/valid-callable')
  , isString  = require('es5-ext/lib/String/is-string')
  , minimatch = require('minimatch')
  , watchPath = require('./watch-path')

  , basename = path.basename, dirname = path.dirname, join = path.join
  , resolve = path.resolve

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/, defaults, getRules, isIgnored
  , iterateIgnoreFiles, patternsToMap;

defaults = {
	git: {
		filename: '.gitignore',
		isRoot: memoize.call(function (path) {
			var watcher, listener, gitPath;
			gitPath = join(path, '.git');
			watcher = watchPath(gitPath);
			watcher.on('change', listener = function (e) {
				if (e.type === 'change') {
					return;
				}
				watcher.off('change', listener);
				defaults.git.isRoot.clearCache(path);
			});
			return lstat(gitPath)(invoke('isDirectory'), false);
		}),
		patterns: ['.git']
	}
};

getRules = memoize.call(function (path, ignorefile) {
	var filename = join(path, ignorefile);
	watchPath(filename).once('change', function () {
		getRules.clearCache(path, ignoreFile);
	});
	return readFile(filename)(function (src) {
		return compact.call(String(src).trim().split(eolRe).map(trim)).reverse();
	}, []);
});

isIgnored = (function () {
	var minimatchOpts = { matchBase: true };

	return function (rules, file) {
		var value;
		return rules.some(function (rule) {
			if (rule[0] === '!') {
				if (minimatch(file, rule.slice(1), minimatchOpts)) {
					value = false;
					return true;
				}
			} else if (minimatch(file, rule, minimatchOpts)) {
				value = true;
				return true;
			}
		}) ? value : null;
	};
}());

iterateIgnoreFiles = function self(path, file, ignoreFiles) {
	var value, count = 0;
	return deferred.some(ignoreFiles, function (conf) {
		return getRules(path, conf.filename)(function (map) {
			return ((value = isIgnored(map, file)) != null);
		});
	})(function (resolved) {
		var parent;
		if (resolved) {
			return value;
		} else {
			return deferred.map(ignoreFiles, function (map) {
				return map.isRoot(path)(function (isRoot) {
					return isRoot ? null : map;
				});
			})(function (result) {
				ignoreFiles = compact.call(result);
				if (!ignoreFiles.length) {
					return null;
				}
				parent = dirname(path);
				return (parent === path) ? null :
					self(parent, '/' + basename(path) + file, ignoreFiles);
			});
		}
	});
};

module.exports = function (path, options) {
	var ignoreFiles, patterns;

	path = resolve(String(path));
	options = Object(options);

	ignoreFiles = isArray(options.ignoreFiles) ?
		copy.call(options.ignoreFiles).reverse() : [];

	ignoreFiles = ignoreFiles.map(function (conf) {
		return { filename: conf.filename, isRoot: promisify(callable(conf.isRoot)) }
	});

	patterns = options.patterns;
	if (isString(patterns)) {
		patterns = patterns.trim().split(eolRe);
	}
	if (isArray(patterns)) {
		patterns = compact.call(patterns.map(trim)).reverse();
	} else {
		patterns = [];
	}

	forEach(defaults, function (value, name) {
		if (options[name]) {
			ignoreFiles.push(value);
			if (value.patterns) {
				unshift.apply(patterns, value.patterns);
			}
		}
	});

	return iterateIgnoreFiles(dirname(path), '/' + basename(path),
		ignoreFiles)(function (result) {
			if (result == null) {
				result = isIgnored(patterns, '/' + basename(path));
			}
			return (result == null) ? false : result;
		}).cb(arguments[2]);
};
