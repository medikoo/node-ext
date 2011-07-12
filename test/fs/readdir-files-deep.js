'use strict';

var path = require('path')

  , pgPath;

pgPath = path.dirname(__dirname) + '/__playground/dirscan';

module.exports = function (t, a, d) {
	t(pgPath, function (err, files) {
		if (err) {
			throw err;
		}
		a.deepEqual(files, ['four', 'one/one/one', 'two/one']); d();
	});
};
