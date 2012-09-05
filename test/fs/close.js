'use strict';

var open = require('../../lib/fs/open');

module.exports = function (t, a, d) {
	open(__filename, 'r')(function (fd) {
		a(typeof fd, 'number');
		return t(fd);
	}).end(d, d);
};
