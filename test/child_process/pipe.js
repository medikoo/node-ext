'use strict';

var path  = require('path')
  , spawn = require('child_process').spawn
  , tPath = path.dirname(__dirname) + '/__playground/pipe-wrapper.js';

module.exports = function (t, a) {
	var child = spawn(tPath);
	return {
		"STDOUT": function (t, a, d) {
			var std = "";
			child.stdout.on('data', function (content) {
				std += content;
			});
			child.on('exit', function () {
				a.equal(std, 'STDOUT\n'); d();
			});
		},
		"STDERR": function (t, a, d) {
			var std = "";
			child.stderr.on('data', function (content) {
				std += content;
			});
			child.on('exit', function () {
				a.equal(std, 'STDERR\n'); d();
			});
		}
	};
};