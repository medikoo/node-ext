'use strict';

var fs        = require('fs')
  , resolve   = require('path').resolve
  , deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , open      = promisify(fs.open)
  , rename    = promisify(fs.rename)
  , write     = promisify(fs.write)
  , close     = promisify(fs.close)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)

  , pgPath = resolve(__dirname, '../__playground/watch')

module.exports = function (t, a, d) {
	var ondirchange = [], onfilechange = [], tmpPath, tmpFilePath, alt
	  , dirPath = resolve(pgPath, 'tmpdir')
	  , filePath = resolve(dirPath, 'tmpfile')
	  , dirCurrent, fileCurrent

	t(dirPath).on('change', function (e) {
		ondirchange.push(e.type);
	});
	t(filePath).on('change', function (e) {
		onfilechange.push(e.type);
	});

	delay(function () {
		return mkdir(dirPath);
	}, 20)()(delay(function () {
		a(String(ondirchange), 'create', "Dir: Dir created");
		a(String(onfilechange), '', "File: Dir created");
		ondirchange = [];
		onfilechange = [];
		return writeFile(filePath, 'raz');
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File created");
		a(String(onfilechange), 'create', "File: File created");
		ondirchange = [];
		onfilechange = [];
		return open(filePath, 'a')(function (fd) {
			return write(fd, new Buffer('dwatrzy'), 0, 3, null)(function () {
				return close(fd);
			});
		});
	}, 20))(delay(function () {
		a(String(ondirchange), '', "Dir: File changed");
		a(String(onfilechange), 'modify', "File: File changed");
		ondirchange = [];
		onfilechange = [];
		return rename(filePath, filePath + 'r');
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File renamed");
		a(String(onfilechange), 'remove', "File: File renamed");
		ondirchange = [];
		onfilechange = [];
		return rename(filePath + 'r', filePath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File renamed back");
		a(String(onfilechange), 'create', "File: File renamed back");
		ondirchange = [];
		onfilechange = [];
		return unlink(filePath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File removed");
		a(String(onfilechange), 'remove', "File: File removed");
		ondirchange = [];
		onfilechange = [];
		return rmdir(dirPath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'remove', "Dir: Dir removed");
		a(String(onfilechange), '', "File: Dir removed");
		ondirchange = [];
		onfilechange = [];
		return mkdir(dirPath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'create', "Dir: Dir created #2");
		a(String(onfilechange), '', "File: Dir created #2");
		ondirchange = [];
		onfilechange = [];
		return writeFile(filePath, 'raz');
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File created #2");
		a(String(onfilechange), 'create', "File: File created #2");
		ondirchange = [];
		onfilechange = [];
		return unlink(filePath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'modify', "Dir: File removed #2");
		a(String(onfilechange), 'remove', "File: File removed #2");
		ondirchange = [];
		onfilechange = [];
		return rmdir(dirPath);
	}, 20))(delay(function () {
		a(String(ondirchange), 'remove', "Dir: Dir removed #2");
		a(String(onfilechange), '', "File: Dir removed #2");
	}, 20)).end(d);
};
