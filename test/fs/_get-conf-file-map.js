'use strict';

var fs        = require('fs')
  , resolve   = require('path').resolve
  , omap      = require('es5-ext/lib/Object/map')
  , deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)
  , mode      = require('../../lib/fs/_ignorefile-modes').git

  , pgPath = resolve(__dirname, '../__playground/_get-ignorefiles-map')

module.exports = function (t, a, d) {
	var data, invoked = false, listener
	  , gitRoot = resolve(pgPath, '.git')
	  , rootFile = resolve(pgPath, '.gitignore')
	  , onePath = resolve(pgPath, 'one')
	  , oneFile = resolve(onePath, '.gitignore')
	  , twoPath = resolve(onePath, 'two')
	  , twoFile = resolve(twoPath, '.gitignore')
	  , gitTwo  = resolve(twoPath, '.git');

	deferred(mkdir(gitRoot), mkdir(onePath)(function () {
		return mkdir(twoPath);
	}))(delay(function () {
		t(twoPath, mode).on('change', listener = function (arg) {
			a(invoked, false, "Invoked once");
			a(arg, data, "Event argument");
			invoked = true;
		});
		return t(twoPath, mode);
	}, 20))(function (value) {
		var map = {};
		map[pgPath] = '';
		map[onePath] = '';
		map[twoPath] = '';
		data = value;
		a(data.root, pgPath, '#1 Root');
		a.deep(omap(data.map, String), map, '#1 Data');
		return writeFile(oneFile, 'foo\n!bar');
	})(delay(function () {
		var map = {};
		map[pgPath] = '';
		map[onePath] = '!bar,foo';
		map[twoPath] = '';
		a(invoked, true, "#2 invoked");
		invoked = false;
		a(data.root, pgPath, '#2 Root');
		a.deep(omap(data.map, String), map, '#2 Data');
		return writeFile(twoFile, '!raz\ndwa\n');
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '';
		map[onePath] = '!bar,foo';
		map[twoPath] = 'dwa,!raz';
		a(invoked, true, "#3 invoked");
		invoked = false;
		a(data.root, pgPath, '#3 Root');
		a.deep(omap(data.map, String), map, '#3 Data');
		return writeFile(rootFile, 'one\n\ntwo\n!three\n');
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '!three,two,one';
		map[onePath] = '!bar,foo';
		map[twoPath] = 'dwa,!raz';
		a(invoked, true, "#4 invoked");
		invoked = false;
		a(data.root, pgPath, '#4 Root');
		a.deep(omap(data.map, String), map, '#4 Data');
		return mkdir(gitTwo);
	}, 20))(delay(function () {
		var map = {};
		map[twoPath] = 'dwa,!raz';
		a(invoked, true, "#5 invoked");
		invoked = false;
		a(data.root, twoPath, '#5 Root');
		a.deep(omap(data.map, String), map, '#5 Data');
		return rmdir(gitTwo);
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '!three,two,one';
		map[onePath] = '!bar,foo';
		map[twoPath] = 'dwa,!raz';
		a(invoked, true, "#6 invoked");
		invoked = false;
		a(data.root, pgPath, '#6 Root');
		a.deep(omap(data.map, String), map, '#6 Data');
		return unlink(twoFile);
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '!three,two,one';
		map[onePath] = '!bar,foo';
		map[twoPath] = '';
		a(invoked, true, "#7 invoked");
		invoked = false;
		a(data.root, pgPath, '#7 Root');
		a.deep(omap(data.map, String), map, '#7 Data');
		return unlink(oneFile);
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '!three,two,one';
		map[onePath] = '';
		map[twoPath] = '';
		a(invoked, true, "#8 invoked");
		invoked = false;
		a(data.root, pgPath, '#8 Root');
		a.deep(omap(data.map, String), map, '#8 Data');
		return unlink(rootFile);
	}, 20))(delay(function () {
		var map = {};
		map[pgPath] = '';
		map[onePath] = '';
		map[twoPath] = '';
		a(invoked, true, "#9 invoked");
		invoked = false;
		a(data.root, pgPath, '#9 Root');
		a.deep(omap(data.map, String), map, '#9 Data');
		t(twoPath, mode).off('change', listener);
		return deferred(rmdir(gitRoot), rmdir(twoPath)(function () {
			return rmdir(onePath);
		}));
	}, 20)).end(d);
};
