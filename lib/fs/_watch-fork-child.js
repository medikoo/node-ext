'use strict';

var watch = require('./_watch');

process.on('message', function (path) {
	var watcher;
	try {
		watcher = watch(path);
	} catch (e) {
		process.send({ path: path, event: 'end' });
		return;
	}
	watcher.on('change', function () {
		process.send({ path: path, event: 'change' });
	});
	watcher.on('end', function () {
		process.send({ path: path, event: 'end' });
	});
});
