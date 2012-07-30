'use strict';

var resolve = require('path').resolve
  , watch;

if (false && (process.platform === 'darwin')) {
	// OSX has crazy limit of 250 descriptors per process
	// We workaround that forking child processes
	watch = require('./_watch-fork')(248);
} else {
	watch = require('./_watch');
}

module.exports = exports = function (path) {
	return watch(resolve(String(path)));
};
exports.watch = watch;
