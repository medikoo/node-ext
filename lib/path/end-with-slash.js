// End path with slash

'use strict';

var normalize = require('./normalize')
  , separator = require('./separator');

module.exports = function (path) {
	path = normalize(path);
	return (path && (path !== separator)) ? (path + separator) : path;
};
