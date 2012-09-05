'use strict';

var close = require('../../lib/fs/close');

module.exports = function (t, a, d) {
	t(__filename, 'r')(function (fd) {
		a(typeof fd, 'number');
		return close(fd);
	}).end(d, d);
};
