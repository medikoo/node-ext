'use strict';

var pg = __dirname + '/__playground';

module.exports = {
	"File path": function (t, a) {
		var path = pg + '/package/sample.js';
		a(t(path)('./sample'), require(path));
	},
	"Dir path": function (t, a) {
		a(t(pg)('./sample'), require(pg + '/sample'));
	}
};
