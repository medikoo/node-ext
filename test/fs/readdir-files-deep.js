'use strict';

var path = require('path')
  , normalize = path.normalize

  , pgPath;

pgPath = path.dirname(__dirname) + '/__playground/dirscan';

module.exports = function (t, a, d) {
	t(pgPath, function (err, files) {
		if (err) {
			throw err;
		}
		a.deepEqual(files.sort(), ['four', normalize('one/one/one'),
			normalize('two/one')].sort()); d();
	});
};
