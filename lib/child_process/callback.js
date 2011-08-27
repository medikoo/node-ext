// spawn for instanst simple processes.

'use strict';

var spawn = require('child_process').spawn
  , peek  = require('es5-ext/lib/List/peek').call
  , slice = require('es5-ext/lib/List/slice').call;

module.exports = function () {
	var p, out, err,  cb;
	cb = peek(arguments);
	p = spawn.apply(null, slice(arguments, 0, -1));
	out = ''; err = '';
	p.stdout.on('data', function (data) {
		out += data;
	});
	p.stderr.on('data', function (data) {
		err += data;
	});
	p.on('exit', function (code) {
		if (code !== 0) {
			err = new Error(err);
			err.code = code;
			err.stdout = out;
			cb(err);
		} else {
			cb(null, { out: out, err: err });
		}
	});
};
