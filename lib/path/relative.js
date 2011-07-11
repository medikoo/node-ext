// Finds relative path between two absolute paths

'use strict';

var trim = require('./trim');

module.exports = function (from, to) {
	var x, y;
	if (from.charAt(0) !== '/') {
		throw new Error("node-ext.path.relative error: "
			+ "Paths should be absolute");
	}
	if (to == null) {
		to = from;
		from = process.env.PWD + '/';
	} else if (to.charAt(0) !== '/') {
		throw new Error("node-ext.path.relative error: "
			+ "Paths should be absolute");
	}

	x = from.split('/');
	y = to.split('/');
	while (x.length && (x[0] === y[0])) {
		x.shift(); y.shift();
	}
	return new Array(x.length).join("../") + y.join("/");
};
