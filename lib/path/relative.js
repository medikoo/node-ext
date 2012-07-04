// Finds relative path between two absolute paths

'use strict';

var path       = require('path')
  , commonLeft = require('es5-ext/lib/Array/prototype/common-left')
  , last       = require('es5-ext/lib/Array/prototype/last')
  , sep  = require('./sep')

  , join = path.join, resolve = path.resolve;

module.exports = function (from, to) {
	var index, str, added;
	if (arguments.length < 2) {
		to = from;
		from = process.cwd();
	}
	from = String(from);
	if (join(last.call(from)) === sep) {
		from = join(from, 'x');
	}
	to = String(to);
	if (join(last.call(to)) === sep) {
		to = join(to, 'x');
		added = true;
	}

	from = resolve(from);
	to = resolve(to);

	index = commonLeft.call(from, to);
	from = from.slice(index);
	to = to.slice(index);

	return (new Array(from.split(sep).length).join('..' + sep) +
		(added ? to.slice(0, -1) : to));
};
