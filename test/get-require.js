'use strict';

var path = require('path')
  , fpath = __dirname + '/__playground/sample.js'
  , o = require('./__playground/sample');

module.exports = {
	"File path": function (t, a) {
		a(t(fpath)('./sample'), o);
	},
	"Dir path": function (t, a) {
		a(t(path.dirname(fpath))('./sample'), o);
	}
};
