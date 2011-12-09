// Cross environment PWD

'use strict';

var exec, nextTick, pwd, curry;

if (process.env.OS.indexOf('Windows') === 0) {
	exec = require('child_process').exec;
	module.exports = function (cb) {
		exec('cd', function (error, stdout, stderr) {
			var err = error || (stderr && new Error(stderr)) || null;
			cb(err, err ? null : stdout.trim());
		});
	}
} else {
	nextTick = process.nextTick;
	pwd = process.env.PWD;
	curry = require('es5-ext/lib/Function/prototype/curry');
	module.exports = function (cb) {
		nextTick(curry.call(cb, null, pwd));
	};
}
