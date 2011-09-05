// End path with slash

'use strict';

var peek = require('es5-ext/lib/List/peek').call;

module.exports = function (path) {
	return (!path || (peek(path) === '/')) ? path : path + '/';
};
