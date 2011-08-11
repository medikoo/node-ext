// Trims trailing slash from given path

'use strict';

module.exports = function (path) {
	return (path[1] && (path.slice(-1) === '/')) ? path.slice(0, -1) : path;
};
