'use strict';

var path = require('path')
  , normalize = path.normalize

  , pgPath;

pgPath = path.dirname(__dirname) + '/__playground/dirscan';

module.exports = function (t) {
	return {
		"": function (a, d) {
			t(pgPath, function (err, files) {
				if (err) {
					throw err;
				}
				a.deepEqual(files.sort(), [
					'.ignore', 'eleven', 'five', 'four', 'nine', 'nine.foo', 'nine.keep',
					'seven', 'six', 'ten',

					'one/.ignore', 'one/eleven', 'one/five', 'one/nine', 'one/nine.bar',
					'one/nine.keep', 'one/seven', 'one/six', 'one/ten',

					'one/one/.ignore', 'one/one/eleven', 'one/one/nine',
					'one/one/nine.else', 'one/one/nine.keep', 'one/one/one',
					'one/one/seven', 'one/one/six', 'one/one/ten',

					'two/one'].map(normalize).sort()); d();
			});
		},
		"ignorefile": function (a, d) {
			t(pgPath, { ignorefile: '.ignore' }, function (err, files) {
				if (err) {
					throw err;
				}
				a.deepEqual(files.sort(), [
					'eleven', 'four', 'nine', 'nine.keep',
					'seven', 'ten',

					'one/eleven', 'one/nine',
					'one/nine.keep', 'one/ten',

					'one/one/nine', 'one/one/nine.keep', 'one/one/one', 'one/one/six',

					'two/one'].map(normalize).sort()); d();
			});
		}
	};
};
