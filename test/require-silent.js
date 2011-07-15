'use strict';

var playground = __dirname + '/__playground';

module.exports = {
	"Existing": function (t, a) {
		var file = playground + '/sample';
		a.equal(t(require)(file), require(file));
	},
	"Non existing": function (t, a) {
		var file = playground + '/sample-na';
		a.strictEqual(t(require)(file), null);
	},
	"With evaluation error": function (t, a) {
		var file = playground + '/sample-error';
		a.ok(t(require)(file) instanceof Error);
	}
};
