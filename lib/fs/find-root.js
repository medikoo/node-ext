'use strict';

var path       = require('path')
  , extend     = require('es5-ext/lib/Object/extend')
  , callable   = require('es5-ext/lib/Object/valid-callable')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , deferred   = require('deferred')

  , resolve = path.resolve, dirname = path.dirname, FindRoot;

FindRoot = function (path, watch) {
	this.path = path;
	this.watch = watch;
	this.onvalue = this.onvalue.bind(this);
	this.onevent = this.onevent.bind(this);
	this.onerror = this.onerror.bind(this);
	extend(this, deferred());
	if (this.watch) {
		this.promises = {};
	}
};

FindRoot.prototype = {
	known: false,
	onvalue: function (value) {
		var dir;
		if (this.known) {
			return;
		}
		if (value) {
			this.known = true;
			if (this.watch && this.promise.resolved) {
				this.promise.value = this.path;
				this.promise.emit('change', this.path);
			} else {
				this.resolve(this.path);
			}
		} else {
			this.down();
		}
	},
	next: function () {
		var isRoot;
		isRoot = this.isRoot(this.path);
		isRoot.end(this.onvalue, this.onerror);
		if (this.watch) {
			this.promises[this.path] = isRoot;
			isRoot.on('change', this.onevent);
		}
	},
	onerror: function (e) {
		if (this.watch) {
			forEach(this.promises, function (promise, path, obj) {
				promise.off('change', this.onevent);
				delete obj[path];
			}, this);
			if (this.promise.resolved) {
				this.promise.value = e;
				this.promise.failed = true;
				this.promise.emit('error', e);
				return;
			}
		}
		this.resolve(e);
	},
	down: function () {
		var dir = dirname(this.path);
		if (dir === this.path) {
			this.known = true;
			this.path = '';
			if (this.watch && this.promise.resolved) {
				this.promise.value = null;
				this.promise.emit('change', null);
			} else {
				this.resolve(null);
			}
			return;
		}
		this.path = dir;
		this.next();
	},
	onevent: function (value, path) {
		var dir;
		if (!value) {
			if (!this.known || (path !== this.path)) {
				return;
			}
			this.known = false;
			this.down();
		} else {
			this.path = path;
			dir = dirname(path);
			while (this.promises[dir]) {
				this.promises[dir].off('change', this.onevent);
				delete this.promises[dir];
				dir = dirname(dir);
			}
			this.known = true;
			this.promise.value = this.path;
			this.promise.emit('change', this.path);
		}
	}
};

module.exports = exports = function (isRoot, path) {
	var options, cb, finder;
	callable(isRoot);
	path = dirname(resolve(String(path)));
	options = Object(arguments[2]);
	cb = arguments[3];
	if (!cb) {
		if (isCallable(options)) {
			cb = options;
			options = {};
		}
	}
	finder = new FindRoot(path, options.watch);
	finder.isRoot = isRoot;
	finder.next();
	return finder.promise.cb(cb);
};
exports.returnsPromise = true;
exports.FindRoot = FindRoot;
