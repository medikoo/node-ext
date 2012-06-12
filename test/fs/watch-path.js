'use strict';

var fs        = require('fs')
  , resolve   = require('path').resolve
  , deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , open      = promisify(fs.open)
  , write     = promisify(fs.write)
  , close     = promisify(fs.close)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)

  , pgPath = resolve(__dirname, '../__playground/watch')

module.exports = function (t, a, d) {
	var ondirchange = [], onfilechange = [], tmpPath, tmpFilePath, alt
	  , dirPath = resolve(pgPath, 'tmp')
	  , filePath = resolve(dirPath, 'tmp')
	  , dirCurrent, fileCurrent

	t(dirPath).on('change', function (e) {
		// console.log("RECEIVED: DIR CHANGE", e.type);
		ondirchange.push(e.type);
	});
	t(filePath).on('change', function (e) {
		// console.log("RECEIVED: FILE CHANGE", e.type);
		onfilechange.push(e.type);
	});

	delay(function () {
		return mkdir(dirPath);
	}, 20)()(delay(function () {
		a(ondirchange.shift(), 'create', "Dir: Dir created");
		a(onfilechange.shift(), undefined, "File: Dir created");
		return writeFile(filePath, 'raz');
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'change', "Dir: File created");
		a(onfilechange.shift(), 'create', "File: File created");
		return open(filePath, 'a')(function (fd) {
			return write(fd, new Buffer('dwatrzy'), 0, 3, null)(function () {
				return close(fd);
			});
		});
	}, 20))(delay(function () {
		a(ondirchange.shift(), undefined, "Dir: File changed");
		a(onfilechange.shift(), 'change', "File: File changed");
		return unlink(filePath);
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'change', "Dir: File removed");
		a(onfilechange.shift(), 'remove', "File: File removed");
		return rmdir(dirPath);
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'remove', "Dir: Dir removed");
		a(onfilechange.shift(), undefined, "File: Dir removed");
		return mkdir(dirPath);
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'create', "Dir: Dir created #2");
		a(onfilechange.shift(), undefined, "File: Dir created #2");
		return writeFile(filePath, 'raz');
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'change', "Dir: File created #2");
		a(onfilechange.shift(), 'create', "File: File created #2");
		return unlink(filePath);
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'change', "Dir: File removed #2");
		a(onfilechange.shift(), 'remove', "File: File removed #2");
		return rmdir(dirPath);
	}, 20))(delay(function () {
		a(ondirchange.shift(), 'remove', "Dir: Dir removed #2");
		a(onfilechange.shift(), undefined, "File: Dir removed #2");
		a.deep(ondirchange, [], "Dir: Extra events");
		a.deep(onfilechange, [], "File: Extra events");
	}, 20)).end(d);
};
