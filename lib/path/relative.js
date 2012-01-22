// Finds relative path between two absolute paths

'use strict';

var normalize  = require('path').normalize
  , contains   = require('es5-ext/lib/String/prototype/contains')
  , sysSep     = require('./separator')
  , normalize2 = require('./normalize')

  , re = /^[A-Z]\:[\\\/]/;

module.exports = function (from, to) {
	var x, y, separator, sfrom, orgto;
	var prefrom = from; orgto = to;
	if (contains.call(from, '/') && contains.call(from, '\\')) {
		from = normalize2(from);
		separator = sysSep;
	}
	if (to && contains.call(to, '/') && contains.call(to, '\\')) {
		to = normalize2(to);
		separator = sysSep;
	}
	if (!separator) {
		if (contains.call(from, '/') || contains.call(to, '/')) {
			separator = '/'; sfrom = /\\/g;
		} else if (contains.call(from, '\\') || contains.call(to, '\\')) {
			separator = '\\'; sfrom = /\//g;
		} else {
			separator = sysSep;
		}
		from = normalize(from).replace(sfrom, separator);
		to = to && normalize(to).replace(sfrom, separator);
	}

	if (from.match(re)) {
		from = from.slice(2);
	}
	if (to && to.match(re)) {
		to = to.slice(2);
	}
	if (from.charAt(0) !== separator) {
		throw new Error("node-ext.path.relative error: "
			+ "Paths should be absolute");
	}
	if (orgto == null) {
		to = from;
		from = process.cwd() + separator;
		if (from.match(re)) {
			from = from.slice(2);
		}
	} else if (to.charAt(0) !== separator) {
		throw new Error("node-ext.path.relative error: "
			+ "Paths should be absolute");
	}

	x = from.split(separator);
	y = to.split(separator);
	while (x.length && (x[0] === y[0])) {
		x.shift(); y.shift();
	}
	return Array(x.length).join(".." + separator) + y.join(separator);
};
