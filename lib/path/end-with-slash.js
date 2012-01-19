// End path with slash

'use strict';

var peek = require('es5-ext/lib/Array/prototype/peek');

module.exports = function (path) {
	return (!path || (peek.call(path) === '/')) ? path : path + '/';
};
