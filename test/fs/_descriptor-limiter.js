'use strict';

module.exports = function (t, a) {
	var invoked;
	a(t.isAvailable(), true, "Available at start");
	t.cb(function () { invoked = true; });
	a(invoked, true, "Callback");
	t.open();
	t.close();
};
