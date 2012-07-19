'use strict';

var push      = Array.prototype.push
  , fs        = require('fs')
  , path      = require('path')
  , copy      = require('es5-ext/lib/Array/prototype/copy')
  , diff      = require('es5-ext/lib/Array/prototype/diff')
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , partial   = require('es5-ext/lib/Function/prototype/partial')
  , deferred  = require('deferred')
  , ee        = require('event-emitter')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)
  , modes     = require('../../lib/fs/_ignorefile-modes')
  , sep       = require('../../lib/path/sep')

  , basename = path.basename, resolve = path.resolve

  , pgPath = resolve(__dirname, '../__playground/readdir');

module.exports = function (t) {
	var pathsAll, paths2, paths0, filesAll, files2, files0, replaceSep
	  , DELAY = 100;
	replaceSep = function (path) {
		return path.replace(/\//g, sep);
	};
	pathsAll = [ 'done', 'done/done', 'done/done/dthree',
		'done/done/dthree/dthree', 'done/done/dthree/dthree/foo',
		'done/done/dthree/dtwo', 'done/done/dthree/dtwo/foo',
		'done/done/dthree/one', 'done/done/dthree/three', 'done/done/dthree/two',
		'done/done/dtwo', 'done/done/dtwo/dtwo', 'done/done/dtwo/dtwo/foo',
		'done/done/dtwo/one', 'done/done/dtwo/three', 'done/done/dtwo/two',
		'done/done/one', 'done/done/three', 'done/done/two', 'done/dtwo',
		'done/dtwo/foo', 'done/one', 'done/three', 'done/two', 'dthree',
		'dthree/dthree', 'dthree/dthree/done', 'dthree/dthree/done/dthree',
		'dthree/dthree/done/dthree/foo', 'dthree/dthree/done/one',
		'dthree/dthree/done/three', 'dthree/dthree/done/two', 'dthree/dthree/one',
		'dthree/dthree/three', 'dthree/dthree/two', 'dthree/dtwo',
		'dthree/dtwo/foo', 'dthree/one', 'dthree/three', 'dthree/two', 'dtwo',
		'dtwo/one', 'dtwo/three', 'dtwo/two', 'one', 'three', 'two']
		.map(replaceSep);

	paths2 = pathsAll.filter(function (path) {
		return path.split(sep).length < 4;
	});

	paths0 = pathsAll.filter(function (path) {
		return path.split(sep).length < 2;
	});

	files2 = paths2.filter(function (path) {
		return basename(path)[0] !== 'd';
	});

	return {
		"": {
			"0": function (a, d) {
				var reader = t(pgPath, { watch: true })
				  , testName = 'foo'
				  , testPath = resolve(pgPath, testName)
				  , paths = paths0
				  , invoked = false;

				reader.on('change', function (data) {
					invoked = data;
				});
				reader(function (data) {
					a.deep(data, paths);
					return mkdir(testPath)
				})(delay(function () {
					a.deep(invoked.old, [], "Created: old");
					a.deep(invoked.new, [testName], "Created: new");
					invoked = false;
					reader(function (data) {
						var npaths = copy.call(paths);
						npaths.push(testName);
						a.deep(data, npaths.sort(), "Created: data");
					});
					return rmdir(testPath);
				}, DELAY))(delay(function () {
					a.deep(invoked.old, [testName], "Deleted: old");
					a.deep(invoked.new, [], "Deleted: new");
					invoked = false;
					reader(function (data) {
						a.deep(data, paths, "Deleted: data");
					});
				}, DELAY)).end(d);
			},
			"2": function (a, d) {
				var reader = t(pgPath, { depth: 2, watch: true })
				  , testName = replaceSep('dtwo/foo')
				  , testPath = resolve(pgPath, testName)
				  , paths = paths2
				  , invoked = false;

				reader.on('change', function (data) {
					invoked = data;
				});
				reader(function (data) {
					a.deep(data, paths);
				})(delay(function () {
					return mkdir(testPath);
				}, DELAY))(delay(function () {
					a.deep(invoked.old, [], "Created: old");
					a.deep(invoked.new, [testName], "Created: new");
					invoked = false;
					reader(function (data) {
						var npaths = copy.call(paths);
						npaths.push(testName);
						a.deep(data, npaths.sort(), "Created: data");
					});
					return rmdir(testPath);
				}, DELAY))(delay(function () {
					a.deep(invoked.old, [testName], "Deleted: old");
					a.deep(invoked.new, [], "Deleted: new");
					invoked = false;
					reader(function (data) {
						a.deep(data, paths, "Deleted: data");
					});
				}, DELAY)).end(d);
			},
			"∞": function (a, d) {
				var reader = t(pgPath, { depth: Infinity, watch: true })
				  , testName = replaceSep('done/done/dthree/test')
				  , testPath = resolve(pgPath, testName)
				  , paths = pathsAll
				  , invoked = false;

				reader.on('change', function (data) {
					invoked = data;
				});
				reader(function (data) {
					a.deep(data, paths);
				})(delay(function () {
					return writeFile(testPath, 'foo');
				}, DELAY))(delay(function () {
					a.deep(invoked.old, [], "Created: old");
					a.deep(invoked.new, [testName], "Created: new");
					invoked = false;
					reader(function (data) {
						var npaths = copy.call(paths);
						npaths.push(testName);
						a.deep(data, npaths.sort(), "Created: data");
					});
					return unlink(testPath);
				}, DELAY))(delay(function () {
					a.deep(invoked.old, [testName], "Deleted: old");
					a.deep(invoked.new, [], "Deleted: new");
					invoked = false;
					reader(function (data) {
						a.deep(data, paths, "Deleted: data");
					});
				}, DELAY)).end(d);
			}
		},
		"Type": function (a, d) {
			var reader = t(pgPath, { depth: 2, type: { file: true }, watch: true })
			  , testName = replaceSep('dtwo/test')
			  , testPath = resolve(pgPath, testName)
			  , paths = files2
			  , invoked = false;

			reader.on('change', function (data) {
				invoked = data;
			});
			reader(function (data) {
				a.deep(data, paths);
				return mkdir(testPath);
			})(delay(function () {
				a(invoked, false, "Created other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				a(invoked, false, "Deleted other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return writeFile(testPath, 'foo');
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				invoked = false;
				reader(function (data) {
					var npaths = copy.call(paths);
					npaths.push(testName);
					a.deep(data, npaths.sort(), "Created: data");
				});
				return unlink(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY)).end(d);
		},
		"Types": function (a, d) {
			var reader = t(pgPath, { depth: 2,
				type: { file: true, directory: true }, watch: true })
			  , testName = replaceSep('dtwo/foo')
			  , testPath = resolve(pgPath, testName)
			  , paths = paths2
			  , invoked = false;

			reader.on('change', function (data) {
				invoked = data;
			});
			reader(delay(function (data) {
				a.deep(data, paths);
				return mkdir(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				invoked = false;
				reader(function (data) {
					var npaths = copy.call(paths);
					npaths.push(testName);
					a.deep(data, npaths.sort(), "Created: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY)).end(d);
		},
		"Pattern": function (a, d) {
			var pattern = /one$/
			  , reader = t(pgPath, { depth: 2, pattern: pattern, watch: true })
			  , otherName = replaceSep('dtwo/test')
			  , otherPath = resolve(pgPath, otherName)
			  , testName = replaceSep('dtwo/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = paths2.filter(function (path) {
					return pattern.test(path);
				})
			  , invoked = false;

			reader.on('change', function (data) {
				invoked = data;
			});
			reader(function (data) {
				a.deep(data, paths);
				return mkdir(otherPath);
			})(delay(function () {
				a(invoked, false, "Created other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return rmdir(otherPath);
			}, DELAY))(delay(function () {
				a(invoked, false, "Deleted other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return mkdir(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				invoked = false;
				reader(function (data) {
					var npaths = copy.call(paths);
					npaths.push(testName);
					a.deep(data, npaths.sort(), "Created: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY)).end(d);
		},
		"Pattern & Type": function (a, d) {
			var pattern = /one$/, reader = t(pgPath,
				{ depth: 2, type: { file: true }, pattern: pattern, watch: true })
			  , testName = replaceSep('dtwo/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = files2.filter(function (path) {
					return pattern.test(path);
				})
			  , invoked = false;

			reader.on('change', function (data) {
				invoked = data;
			});
			reader(delay(function (data) {
				a.deep(data, paths);
				return mkdir(testPath);
			}, DELAY))(delay(function () {
				a(invoked, false, "Created other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				a(invoked, false, "Deleted other type: event");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return writeFile(testPath, 'foo');
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				invoked = false;
				reader(function (data) {
					var npaths = copy.call(paths);
					npaths.push(testName);
					a.deep(data, npaths.sort(), "Created: data");
				});
				return unlink(testPath);
			}, DELAY))(delay(function () {
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				invoked = false;
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY)).end(d);
		},
		"Ignored": function (a, d) {
			var gitPath = resolve(pgPath, '.git')
			  , ignoreFile = resolve(pgPath, '.gitignore')
			  , otherName = replaceSep('dtwo/test')
			  , otherPath = resolve(pgPath, otherName)
			  , testName = replaceSep('dthree/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = paths2.filter(function (path) {
					return path.indexOf('dtwo') === -1;
				})
			  , reader, invoked = [], mergeInvoked;

			mergeInvoked = function () {
				var result;
				if (!invoked.length) {
					return false;
				}
				result = { data: invoked[0].data, old: [], new: [] };
				invoked.forEach(function (data) {
					push.apply(result.new, data.new);
					push.apply(result.old, data.old);
				});
				invoked = [];
				return result;
			};

			paths.push('.gitignore');
			paths.sort();
			deferred(mkdir(gitPath), writeFile(ignoreFile, 'dtwo'))(delay(function () {
				reader = t(pgPath, { depth: 2, ignoreRules: 'git', watch: true });
				reader.on('change', function (data) {
					invoked.push(data);
				});
				return reader;
			}, DELAY))(function (data) {
				a.deep(data, paths);
				return mkdir(otherPath);
			})(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Created other type: event");
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return rmdir(otherPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Deleted other type: event");
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return mkdir(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				reader(function (data) {
					var paths = copy.call(paths);
					paths.push(testName);
					a.deep(data, paths.sort(), "Created: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
				return writeFile(ignoreFile, 'dtwo\none');
			}, DELAY))(delay(function () {
				var npaths = paths.filter(function (path) {
					return (path !== 'one') && (path.indexOf(sep + 'one') === -1);
				}).sort();
				var invoked = mergeInvoked();
				a.deep(invoked && invoked.old && invoked.old.sort(),
					diff.call(paths, npaths).sort(),
					"Ignored: old");
				a.deep(invoked.new, [], "Ignored: new");
				reader(function (data) {
					a.deep(data, npaths, "Ignored: data");
				});
				return deferred(rmdir(gitPath), unlink(ignoreFile));
			}, DELAY)).end(d);
		},
		"Ignored & Type": function (a, d) {
			var gitPath = resolve(pgPath, '.git')
			  , ignoreFile = resolve(pgPath, '.gitignore')
			  , otherName = replaceSep('dtwo/test')
			  , otherPath = resolve(pgPath, otherName)
			  , testName = replaceSep('dthree/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = files2.filter(function (path) {
					return path.indexOf('dtwo') === -1;
				})
			  , reader, invoked = [], mergeInvoked;

			mergeInvoked = function () {
				var result;
				if (!invoked.length) {
					return false;
				}
				result = { data: invoked[0].data, old: [], new: [] };
				invoked.forEach(function (data) {
					push.apply(result.new, data.new);
					push.apply(result.old, data.old);
				});
				invoked = [];
				return result;
			};

			paths.push('.gitignore');
			paths.sort();
			deferred(mkdir(gitPath), writeFile(ignoreFile, 'dtwo'))(delay(
				function () {
					reader = t(pgPath, { depth: 2, type: { file: true },
						ignoreRules: 'git', watch: true });
					reader.on('change', function (data) {
						invoked.push(data);
					});
					return reader;
				}, DELAY
			))(delay(function (data) {
				a.deep(data, paths);
				return writeFile(otherPath, 'foo');
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Created other type: event");
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return unlink(otherPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Deleted other type: event");
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return writeFile(testPath, 'foo');
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				reader(function (data) {
					var paths = copy.call(paths);
					paths.push(testName);
					a.deep(data, paths.sort(), "Created: data");
				});
				return unlink(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY))(delay(function () {
				return writeFile(ignoreFile, 'dtwo\none');
			}, DELAY))(delay(function () {
				var npaths = paths.filter(function (path) {
					return (path !== 'one') && (path.indexOf(sep + 'one') === -1);
				}).sort();
				var invoked = mergeInvoked();
				a.deep(invoked.old && invoked.old.sort(),
					diff.call(paths, npaths).sort(), "Ignored: old");
				a.deep(invoked.new, [], "Ignored: new");
				reader(function (data) {
					a.deep(data, npaths, "Ignored: data");
				});
				return deferred(rmdir(gitPath), unlink(ignoreFile));
			}, DELAY)).end(d);
		},
		"Ignored & Pattern": function (a, d) {
			var pattern = /done/, gitPath = resolve(pgPath, '.git')
			  , ignoreFile = resolve(pgPath, '.gitignore')
			  , otherName = replaceSep('dtwo/test')
			  , otherPath = resolve(pgPath, otherName)
			  , testName = replaceSep('done/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = paths2.filter(function (path) {
					return (path.indexOf('dtwo') === -1) && pattern.test(path);
				})
			  , reader, invoked = [], mergeInvoked;

			mergeInvoked = function () {
				var result;
				if (!invoked.length) {
					return false;
				}
				result = { data: invoked[0].data, old: [], new: [] };
				invoked.forEach(function (data) {
					push.apply(result.new, data.new);
					push.apply(result.old, data.old);
				});
				invoked = [];
				return result;
			};

			deferred(mkdir(gitPath),writeFile(ignoreFile, 'dtwo'))(delay(
				function () {
					reader = t(pgPath, { depth: 2, pattern: pattern,
						ignoreRules: 'git', watch: true });
					reader.on('change', function (data) {
						invoked.push(data);
					});
					return reader;
				}, DELAY
			))(delay(function (data) {
				a.deep(data, paths);
				return mkdir(otherPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Created other type: event");
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return rmdir(otherPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Deleted other type: event");
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return mkdir(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				reader(function (data) {
					var paths = copy.call(paths);
					paths.push(testName);
					a.deep(data, paths.sort(), "Created: data");
				});
				return rmdir(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY))(delay(function () {
				return writeFile(ignoreFile, 'dtwo\none');
			}, DELAY))(delay(function () {
				var npaths = paths.filter(function (path) {
					return (path !== 'one') && (path.indexOf(sep + 'one') === -1);
				}).sort();
				var invoked = mergeInvoked();
				a.deep(invoked && invoked.old && invoked.old.sort(),
					diff.call(paths, npaths).sort(), "Ignored: old");
				a.deep(invoked.new, [], "Ignored: new");
				reader(function (data) {
					a.deep(data, npaths, "Ignored: data");
				});
				return deferred(rmdir(gitPath), unlink(ignoreFile));
			}, DELAY)).end(d);
		},
		"Ignored & Pattern & Type": function (a, d) {
			var pattern = /done/, gitPath = resolve(pgPath, '.git')
			  , ignoreFile = resolve(pgPath, '.gitignore')
			  , otherName = replaceSep('dtwo/test')
			  , otherPath = resolve(pgPath, otherName)
			  , testName = replaceSep('done/fooone')
			  , testPath = resolve(pgPath, testName)
			  , paths = files2.filter(function (path) {
					return (path.indexOf('dtwo') === -1) && pattern.test(path);
				})
			  , reader, invoked = [], mergeInvoked;

			mergeInvoked = function () {
				var result;
				if (!invoked.length) {
					return false;
				}
				result = { data: invoked[0].data, old: [], new: [] };
				invoked.forEach(function (data) {
					push.apply(result.new, data.new);
					push.apply(result.old, data.old);
				});
				invoked = [];
				return result;
			};

			deferred(mkdir(gitPath), writeFile(ignoreFile, 'dtwo'))(delay(
				function () {
					reader = t(pgPath, { depth: 2, type: { file: true }, pattern: pattern,
						ignoreRules: 'git', watch: true });
					reader.on('change', function (data) {
						invoked.push(data);
					});
					return reader;
				}, DELAY
			))(delay(function (data) {
				a.deep(data, paths);
				return writeFile(otherPath, 'foo');
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Created other type: event");
				reader(function (data) {
					a.deep(data, paths, "Created other type: data");
				});
				return unlink(otherPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a(invoked, false, "Deleted other type: event");
				reader(function (data) {
					a.deep(data, paths, "Deleted other type: data");
				});
				return writeFile(testPath, 'foo');
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [], "Created: old");
				a.deep(invoked.new, [testName], "Created: new");
				reader(function (data) {
					var paths = copy.call(paths);
					paths.push(testName);
					a.deep(data, paths.sort(), "Created: data");
				});
				return unlink(testPath);
			}, DELAY))(delay(function () {
				var invoked = mergeInvoked();
				a.deep(invoked.old, [testName], "Deleted: old");
				a.deep(invoked.new, [], "Deleted: new");
				reader(function (data) {
					a.deep(data, paths, "Deleted: data");
				});
			}, DELAY))(delay(function () {
				return writeFile(ignoreFile, 'dtwo\none');
			}, DELAY))(delay(function () {
				var npaths = paths.filter(function (path) {
					return (path !== 'one') && (path.indexOf(sep + 'one') === -1);
				}).sort();
				var invoked = mergeInvoked();
				a.deep(invoked && invoked.old && invoked.old.sort(),
					diff.call(paths, npaths).sort(), "Ignored: old");
				a.deep(invoked.new, [], "Ignored: new");
				reader(function (data) {
					a.deep(data, npaths, "Ignored: data");
				});
				return deferred(rmdir(gitPath), unlink(ignoreFile));
			}, DELAY)).end(d);
		}
	};
};
