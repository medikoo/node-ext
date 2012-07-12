'use strict';

var fs        = require('fs')
  , resolve   = require('path').resolve
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , partial   = require('es5-ext/lib/Function/prototype/partial')
  , deferred  = require('deferred')
  , ee        = require('event-emitter')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , mkdir     = promisify(fs.mkdir)
  , writeFile = promisify(fs.writeFile)
  , unlink    = promisify(fs.unlink)
  , rmdir     = promisify(fs.rmdir)
  , modes     = require('../../lib/fs/_ignorefile-modes')

  , pgPath = resolve(__dirname, '../__playground/is-ignored');

module.exports = function (t, a, d) {
	var data, invoked = null, listener
	  , DELAY = 100
	  , gitRoot = resolve(pgPath, '.git')
	  , rootFile = resolve(pgPath, '.gitignore')
	  , onePath = resolve(pgPath, 'one')
	  , oneFile = resolve(onePath, '.gitignore')
	  , twoPath = resolve(onePath, 'two')
	  , twoFile = resolve(twoPath, '.gitignore')
	  , twoOtherFile = resolve(twoPath, '.ignore')
	  , twoFooPath = resolve(twoPath, 'foo')

	modes.test = {
		filename: '.ignore',
		globalRules: ['.ignore'],
		findRoot: partial.call(require('../../lib/fs/find-root'),
			memoize.call(function (path) {
				return ee(deferred(path === onePath));
			}))
	};

	deferred(mkdir(gitRoot), mkdir(onePath)(function () {
		return mkdir(twoPath);
	}))(delay(function () {
		t('git', resolve(gitRoot, 'foo/bar'))(function (value) {
			a(value, true, "Ignore gitrepo file");
		}).end();
		t('git', twoFooPath).on('change', listener = function (arg) {
			a(invoked, null, "Invoked once");
			invoked = arg;
		});
		return t('git', twoFooPath);
	}, DELAY))(delay(function (value) {
		a(value, false, "#1");
		return writeFile(rootFile, 'foo');
	}, DELAY))(delay(function () {
		a(invoked, true, "#2 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, true, "#2");
		});
		return writeFile(oneFile, '/two/foo');
	}, DELAY))(delay(function () {
		a(invoked, null, "#3 event");
		t('git', twoFooPath)(function (value) {
			a(value, true, "#3");
		});
		return writeFile(twoFile, '!foo');
	}, DELAY))(delay(function () {
		a(invoked, false, "#4 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, false, "#4");
		});
		return deferred(unlink(rootFile), unlink(oneFile));
	}, DELAY))(delay(function () {
		a(invoked, null, "#5 event");
		t('git', twoFooPath)(function (value) {
			a(value, false, "#5");
		});
		return unlink(twoFile);
	}, DELAY))(delay(function () {
		a(invoked, null, "#6 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, false, "#6");
		});
		return writeFile(oneFile, '/two/foo\n!/two/foo');
	}, DELAY))(delay(function () {
		a(invoked, null, "#7 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, false, "#7");
		});
		return writeFile(rootFile, 'two');
	}, DELAY))(delay(function () {
		a(invoked, true, "#8 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, true, "#8");
		});
		return unlink(rootFile);
	}, DELAY))(delay(function () {
		a(invoked, false, "#9 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, false, "#9");
		});
		return writeFile(rootFile, '/one');
	}, DELAY))(delay(function () {
		a(invoked, true, "#10 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, true, "#10");
		});
		t('git', twoFooPath).off('change', listener);
		return deferred(writeFile(rootFile, 'one\n!one/two/foo'), unlink(oneFile));
	}, DELAY))(delay(function () {
		a(invoked, null, "#11 event");
		invoked = null;
		t('git', twoFooPath)(function (value) {
			a(value, true, "#11");
		});

		return unlink(rootFile);
	}, DELAY))(delay(function () {
		t('git', twoFooPath).off('change', listener);

		t(['git', 'test'], twoFooPath).on('change', listener = function (arg) {
			a(invoked, null, "Invoked once");
			invoked = arg;
		});
		return t('git', twoFooPath);
	}, DELAY))(function (value) {
		a(value, false, "Both #1");
		return writeFile(rootFile, 'foo')
	})(delay(function () {
		a(invoked, true, "Both #2");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, true, "Both #2");
		});
		return writeFile(twoOtherFile, '!foo');
	}, DELAY))(delay(function () {
		a(invoked, false, "Both #3");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, false, "Both #3");
		});
		return writeFile(rootFile, 'one\n');
	}, DELAY))(delay(function () {
		a(invoked, true, "Both #4");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, true, "Both #4");
		});
		return unlink(rootFile);
	}, DELAY))(delay(function () {
		a(invoked, false, "Both #5");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, false, "Both #5");
		});
		return writeFile(twoOtherFile, 'foo');
	}, DELAY))(delay(function () {
		a(invoked, true, "Both #6");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, true, "Both #6");
		});
		return writeFile(twoFile, '!foo');
	}, DELAY))(delay(function () {
		a(invoked, null, "Both #7");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, true, "Both #7");
		});
		return writeFile(twoOtherFile, '!foo');
	}, DELAY))(delay(function () {
		a(invoked, false, "Both #8");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, false, "Both #8");
		});
		return writeFile(twoFile, 'foo');
	}, DELAY))(delay(function () {
		a(invoked, null, "Both #9");
		invoked = null;
		t(['git', 'test'], twoFooPath)(function (value) {
			a(value, false, "Both #9");
		});
		t(['git', 'test'], twoFooPath).off('change', listener);

		return deferred(unlink(twoFile), unlink(twoOtherFile));
	}, DELAY))(delay(function () {

		t(null, twoFooPath, { globalRules: 'foo' })(function (value) {
			a(value, true, "Global: Direct");
		});
		t(null, twoFooPath, { globalRules: ['one'] })(function (value) {
			a(value, true, "Global: Upper");
		});
		t(null, twoFooPath, { globalRules: ['bar'] })(function (value) {
			a(value, false, "Global: Not matching");
		});
		return deferred(rmdir(gitRoot), rmdir(twoPath)(function () {
			return rmdir(onePath);
		}));
	}, DELAY)).end(d);
};
