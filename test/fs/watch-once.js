'use strict';

var fs        = require('fs')
  , resolve   = require('path').resolve
  , deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)

  , pgPath = resolve(__dirname, '../__playground/watch')

module.exports = function (t, a, d) {
	var count = '', tmpPath, tmpFilePath, alt;

	t(pgPath, function () {
		count += 'a';
	});

	delay(function () {
		return mkdir(tmpPath = resolve(pgPath, 'temp'));
	}, 10)()(delay(function () {
		a(count, 'a', "Dir: Dir: created");
		// Create File
		t(tmpPath, function () {
			count += 'b';
		});
	}, 10))(delay(function () {
		return writeFile(tmpFilePath = resolve(tmpPath, 'tmp'), 'raz');
	}, 10))(delay(function () {
		a(count, 'ab', "Dir: File: create")
		t(tmpPath, function () {
			count += 'c'
		});
		t(tmpFilePath, function () {
			alt = true;
		});
	}, 10))(delay(function () {
		return unlink(tmpFilePath);
	}, 10))(delay(function () {
		a(count, 'abc', "Dir: File: remove")
		a(alt, true, "File: remove");
		t(pgPath, function () {
			count += 'd'
		});
	}, 10))(delay(function () {
		return rmdir(tmpPath);
	}, 10))(delay(function () {
		a(count, 'abcd', "Dir: Dir: remove")
	}, 10)).end(d);
};
