'use strict';

var watch = require('fs').watch;

var i = 0;
module.exports = function (filename, listener) {
	// return;
	++i;
	if (false) {
		console.log("CHECK", filename);
		return;
	}
	console.log("OPEN", i);
	var watcher = watch(filename, { persistent: false }, function () {
		watcher.close();
		console.log("CLOSED", filename, --i);
		listener();
	});
};
