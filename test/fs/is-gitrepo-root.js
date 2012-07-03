'use strict';

var fs        = require('fs')
  , deferred  = require('deferred')
  , resolve   = require('path').resolve
  , promisify = deferred.promisify
  , delay     = deferred.delay
  , mkdir     = promisify(fs.mkdir)
  , rmdir     = promisify(fs.rmdir)

  , rootPath = resolve(__dirname, '../__playground/is-gitrepo')

module.exports = function (t, a, d) {
	var gitRoot = resolve(rootPath, '.git')
	  , onePath = resolve(rootPath, 'one')
	  , gitOnePath = resolve(onePath, '.git')
	  , twoPath = resolve(onePath, 'two')
	  , gitTwoPath = resolve(twoPath, '.git')
	  , filePath = resolve(twoPath, 'file.xxx')

	  , watcher, rootEvents = [], oneEvents = [], twoEvents = [];

	// Create /.git
	mkdir(gitRoot)(function () {

		// Create /one
		return mkdir(onePath);
	})(function () {

		// Create /one/.git
		return mkdir(gitOnePath);
	})(function () {
		t(rootPath).on('change', function (value) {
			rootEvents.push(value);
		});
		t(onePath).on('change', function (value) {
			oneEvents.push(value);
		});
		t(twoPath).on('change', function (value) {
			twoEvents.push(value);
		});
		return deferred(t(rootPath), t(onePath), t(twoPath));
	})(delay(function (data) {
		a.deep(data, [true, true, false], "#1");
		a(String(rootEvents), '', "#1: Root Event");
		a(String(oneEvents), '', "#1: One Event");
		a(String(twoEvents), '', "#1: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		// Create /one/two
		return mkdir(twoPath);
	}, 20))(delay(function () {

		// Create /one/two/.git
		return mkdir(gitTwoPath);
	}, 20))(delay(function () {
		a(String(rootEvents), '', "#2: Root Event");
		a(String(oneEvents), '', "#2: One Event");
		a(String(twoEvents), 'true', "#2: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, true, true], "#2");

		// Remove /one/.git
		return rmdir(gitOnePath);
	})(delay(function () {
		a(String(rootEvents), '', "#3: Root Event");
		a(String(oneEvents), 'false', "#3: One Event");
		a(String(twoEvents), '', "#3: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, false, true], "#3");

		// Remove /one/two/.git
		return rmdir(gitTwoPath);
	})(delay(function () {
		a(String(rootEvents), '', "#4: Root Event");
		a(String(oneEvents), '', "#4: One Event");
		a(String(twoEvents), 'false', "#4: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, false, false], "#4");

		// Create /one/two/.git
		return mkdir(gitTwoPath);
	})(delay(function () {
		a(String(rootEvents), '', "#5: Root Event");
		a(String(oneEvents), '', "#5: One Event");
		a(String(twoEvents), 'true', "#5: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, false, true], "#5");

		// Remove /one/two/.git
		return rmdir(gitTwoPath);
	})(delay(function () {
		a(String(rootEvents), '', "#6: Root Event");
		a(String(oneEvents), '', "#6: One Event");
		a(String(twoEvents), 'false', "#6: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, false, false], "#6");
	})(function () {

		// Remove /one/two
		return rmdir(twoPath);
	})(function () {

		// Remove /one
		return rmdir(onePath);
	})(delay(function () {
		a(String(rootEvents), '', "#7: Root Event");
		a(String(oneEvents), '', "#7: One Event");
		a(String(twoEvents), '', "#7: Two Event");
		rootEvents = [];
		oneEvents = [];
		twoEvents = [];

		return deferred(t(rootPath), t(onePath), t(twoPath));
	}, 20))(function (data) {
		a.deep(data, [true, false, false], "#7");

		return rmdir(gitRoot);
	}).end(d);
};
