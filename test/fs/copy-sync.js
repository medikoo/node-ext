'use strict';

var path = require('path')
  , pg   = path.dirname(__dirname) + '/__playground'

  , tests = require('./copy.tests');

module.exports = {
	"Success": function (t, a, d) {
		var src = pg + '/sample.js'
		  , dst = pg + '/sample.copy.js';
		t(src, dst);
		tests(src, dst, a, d);
	}
};
