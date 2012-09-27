'use strict';

var deferred  = require('deferred')
  , resolve   = require('path').resolve
  , lstat     = require('fs').lstat
  , WatchPath = require('./watch-path').WatchPath

  , basic, watch, isRoot;

basic = function (path) {
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
	var promise, watcher;
	promise = basic(path);
	watcher = new WatchPath(promise.gitPath);
	watcher.on('change', function (event) {
		if (event.type === 'create') {
			promise.value = true;
		} else if (event.type == 'remove') {
			promise.value = false;
		} else {
			return;
		}
		promise.emit('change', promise.value, path);
	});
	promise.close = watcher.close;
	return promise;
};
basic.returnsPromise = watch.returnsPromise = true;

module.exports = exports = function (path) {
	var options, promise;
	path = resolve(String(path));
	options = arguments[1];
	return (options && options.watch) ? watch(path) : basic(path);
};
exports.returnsPromise = true;
exports.basic = basic;
exports.watch = watch;
