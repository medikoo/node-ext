'use strict';

var resolve   = require('path').resolve
  , lstat     = require('fs').lstat
  , deferred  = require('deferred')
  , watchPath = require('./watch-path')

  , isRoot, watch;

isRoot = function (path) {
	var def, gPath;

	gPath = resolve(path, '.git');
	def = deferred();
	lstat(gPath, function (err, stats) {
		def.resolve(err ? false : stats.isDirectory());
	});
	def.promise.gitPath = gPath;
	def.promise.path = path;
	return def.promise;
};

watch = function (path) {
	var promise = isRoot(path);
	watchPath(promise.gitPath).on('change', function (event) {
		if (event.type === 'create') {
			promise.value = true;
		} else if (event.type == 'remove') {
			promise.value = false;
		} else {
			return;
		}
		promise.emit('change', promise.value, path);
	});
	return promise;
};

module.exports = exports = function (path) {
	var options, promise;
	path = resolve(String(path));
	options = arguments[1];
	return (options && options.watch) ? watch(path) : isRoot(path);
};
exports.isRoot = isRoot;
exports.watch = watch;
