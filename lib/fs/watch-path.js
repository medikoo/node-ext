'use strict';

var fs        = require('fs')
  , path      = require('path')
  , lstat     = require('deferred').promisify(fs.lstat)
  , chain     = require('es5-ext/lib/Function/prototype/chain')
  , ee        = require('event-emitter')
  , watch     = require('./watch')

  , basename = path.basename, dirname = path.dirname, join = path.join
  , resolve = path.resolve
  , Watcher;

Watcher = function (path) {
	this.path = path;
	this.missing = [];
	this.onchange = this.onchange.bind(this);
	this.onremove = this.onremove.bind(this);
	this.up = this.up.bind(this);
	this.watch();
	return this.emitter = ee();
};

Watcher.prototype = {
	up: function () {
		var parent = dirname(this.path);
		if (parent === this.path) {
			return;
		}
		this.missing.unshift(basename(this.path));
		this.path = parent;
		this.watch();
	},
	watch: function () {
		var watcher;
		try {
			watcher = watch(this.path);
		} catch (e) {
			this.up();
			return;
		}
		this.onwatch(watcher);
	},
	tryDown: function () {
		var current = this.path, pe, promise, npath;
		npath = join(this.path, this.missing[0]);
		try {
			pe = watch(npath);
		} catch (e) {
			return false;
		}
		this.path = npath;
		this.missing.shift();
		if (!this.missing.length) {
			this.onwatch(pe);
			this.oncreate();
		} else if (!this.tryDown()) {
			this.onwatch(pe);
		}
		return true;
	},
	onwatch: function (pe) {
		var onchange;
		var current = this.path;
		if (!this.missing.length) {
			pe.on('change', this.onchange);
			pe.once('end', this.onremove);
		} else {
			pe.on('change', onchange = (function () {
				if (this.tryDown()) {
					pe.off('change', onchange);
					pe.off('end', this.up);
				}
			}.bind(this)));
			pe.once('end', this.up);
		}
	},
	oncreate: function () {
		this.emitter.emit('change', { type: 'create' });
	},
	onchange: function () {
		this.emitter.emit('change', { type: 'modify' });
	},
	onremove: function () {
		this.emitter.emit('change', { type: 'remove' });
		this.up();
	}
};

module.exports = function (path) {
	return new Watcher(resolve(String(path)));
};
