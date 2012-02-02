// Read all filenames from directory and it's subdirectories

'use strict';

var call       = Function.prototype.call
  , keys       = Object.keys
  , trim       = call.bind(String.prototype.trim)
  , fs         = require('fs')
  , normalize  = require('../path/normalize')
  , compact    = require('es5-ext/lib/Array/prototype/compact')
  , contains   = require('es5-ext/lib/Array/prototype/contains')
  , copy       = require('es5-ext/lib/Array/prototype/copy')
  , group      = require('es5-ext/lib/Array/prototype/group')
  , memoize    = require('es5-ext/lib/Function/memoize')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , minimatch  = require('minimatch')

  , readdir = fs.readdir, lstat = fs.lstat, readFile = fs.readFile
  , read, read2, match, match2, prepIgnore;

read = function (path, options, ignore, files, cb) {
	if (!files.length) {
		cb(null, []);
		return;
	}
	if (options.ignorefile && contains.call(files, options.ignorefile)) {
		readFile(path + '/' + options.ignorefile, 'utf-8', function (err, result) {
			var nignore;
			if (err) {
				cb(err);
				return;
			}
			if (!ignore['/']) {
				ignore['/'] = [];
			}
			nignore = ignore['/'];
			compact.call(result.split('\n').map(trim)).forEach(function (key) {
				nignore.push(key);
			});
			read2(path, options, ignore, files, cb);
		});
	} else {
		read2(path, options, ignore, files, cb);
	}
};

prepIgnore = memoize(function (ignore) {
	var res = group.call(ignore, function (item) {
		return (item[0] === '!') ? 'exclude' : 'include';
	});
	!res.exclude && (res.exclude = []);
	!res.include && (res.include = []);
	return res;
});

match = function (ignore, file) {
	if (!ignore.length) {
		return false;
	}
	ignore = prepIgnore(ignore);
	return ignore.include.some(function (pattern) {
		return minimatch(file, pattern, { matchBase: true });
	}) && ignore.exclude.every(function (pattern) {
		return minimatch(file, pattern, { matchBase: true });
	});
};

match2 = function (ignore, file) {
	return keys(ignore).some(function (key) {
		return match(ignore[key], key + file);
	});
};

read2 = function (path, options, ignore, files, cb) {
	var waiting = files.length, result = [], nignore;
	files.forEach(function (file) {
		if (match2(ignore, file)) {
			if (!--waiting) {
				cb(null, result);
			}
			return;
		}
		lstat(path + '/' + file, function (err, stat) {
			if (err) {
				if (!--waiting) {
					cb(null, result);
				}
			} else if (stat.isFile()) {
				if (!options.pattern || options.pattern.test(file)) {
					result.push(file);
				}
				if (!--waiting) {
					cb(null, result);
				}
			} else if (stat.isDirectory()) {
				readdir(path + '/' + file, function (err, files) {
					if (err) {
						if (!--waiting) {
							cb(null, result);
						}
					} else {
						nignore = {};
						keys(ignore).forEach(function (key) {
							nignore[key + file + '/'] = ignore[key];
						});
						read(path + '/' + file, options, nignore, files, function (err, res) {
							if (err) {
								cb(err);
								waiting = -1;
								return;
							}
							result = result.concat(res.map(function (name) {
								return normalize(file + '/' + name);
							}));
							if (!--waiting) {
								cb(null, result);
							}
						});
					}
				});
			} else if (!--waiting) {
				cb(null, result);
			}
		});
	});
};

module.exports = function self (path, options, cb) {
	var ignore;
	if (isCallable(options)) {
		cb = options;
		options = {};
	}
	ignore = options.ignore ? copy.call(options.ignore) : [];
	if (options.ignorefile) {
		if (!contains.call(ignore, options.ignorefile)) {
			ignore.push(options.ignorefile);
		}
		if ((options.ignorefile === '.gitignore') &&
			(!contains.call(ignore, '.git'))) {
			ignore.push('.git');
		}
	}
	ignore = { "/": ignore };
	readdir(path = normalize(path), function (err, files) {
		if (err) {
			cb(err);
			return;
		}
		read(path, options, ignore, files, function (err, result) {
			if (err) {
				cb(err);
				return;
			}
			cb(null, result.sort());
		});
	});
};
