'use strict';

var fs = require('fs');

module.exports = function (t, a, d) {
	fs.closeSync(fs.openSync(__filename, 'r'));
	fs.open(__filename, 'r', function (err, fd) {
		a(typeof fd, 'number');
		fs.close(fd, d);
	});
};
