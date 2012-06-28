'use strict';

var nextTick  = process.nextTick
  , fs        = require('fs')
  , path      = require('path')
  , deferred  = require('deferred')
  , promisify = deferred.promisify
  , lstat     = promisify(fs.lstat)
  , watch     = fs.watch
  , chain     = require('es5-ext/lib/Function/prototype/chain')
  , memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , callable  = require('es5-ext/lib/Object/valid-callable')
  , ee        = require('event-emitter')

  , basename = path.basename, dirname = path.dirname, join = path.join
  , resolve = path.resolve

  , opts = { persistent: false }, Watcher, watchPath;

watchPath = memoize.call(function (path) {
	var emitter, stats, fn, watcher, id = 0
	  , onEnd;

	onEnd = function () {
		if (emitter) {
			emitter.emit('end');
			emitter.allOff();
			emitter = null;
			watchPath.clearCache(path);
			watcher.removeListener('change', fn);
		}
	};

	fn = function (type) {
		var nstats, nwatcher;
		if (!emitter) {
			return;
		}
		++id;
		// Hold horses until all events for the same change are propagated
		nextTick(function () {
			if (!emitter || (id != this)) {
				return;
			}
			if ((type === 'rename') || (stats.isFile() && (type === 'change'))) {
				lstat(path).end(function (nstats) {
					if (!emitter) {
						return;
					}
					if (stats.ctime.valueOf() === nstats.ctime.valueOf()) {
						if (stats.isDirectory() ||
							 (stats.mtime.valueOf() !== nstats.mtime.valueOf()) ||
							 (stats.size !== nstats.size)) {
							emitter.emit('change');
						}
					} else {
						try {
							nwatcher = watch(path, opts, fn);
							watcher.on('error', onEnd);
						} catch (e) {
							onEnd();
							return;
						}
						watcher.removeListener('change', fn);
						watcher = nwatcher;
						emitter.emit('change');
					}
					stats = nstats;
				}, onEnd);
			} else if (!stats.isDirectory()) {
				emitter.emit('change');
			}
		}.bind(id));
	};

	try {
		watcher = watch(path, opts, fn);
		watcher.on('error', onEnd);
	} catch (e) {
		watchPath.preventCache = true;
		return deferred(e);
	}
	return lstat(path)(function (nstats) {
		stats = nstats;
		emitter = ee();
		emitter.path = path;
		return emitter;
	}, function (e) {
		watchPath.clearCache(path);
		watcher.removeListener('change', fn);
		return e;
	});
});

Watcher = function (path) {
	this.path = path;
	this.initPath = path;
	this.missing = [];
	this.onwatch = this.onwatch.bind(this);
	this.oncreate = this.oncreate.bind(this);
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
		return watchPath(this.path).cb(this.onwatch, this.up);
	},
	tryDown: function () {
		var current = this.path;
		return watchPath(join(this.path, this.missing[0])).cb(function (pe) {
			var promise;
			if (this.path === current) {
				this.path = join(this.path, this.missing.shift());
				this.onwatch(pe);
				if (!this.missing.length) {
					this.oncreate();
				}
			}
		}.bind(this), null);
	},
	onwatch: function (pe) {
		var onchange;
		var current = this.path;
		if (!this.missing.length) {
			pe.on('change', this.onchange);
			pe.once('end', this.onremove);
		} else {
			pe.on('change', onchange = (function () {
				this.tryDown().cb(function () {
					pe.off('change', onchange);
					pe.off('end', this.up);
				}.bind(this), null);
			}.bind(this)));
			pe.once('end', this.up);
		}
	},
	oncreate: function () {
		this.emitter.emit('change', { type: 'create' });
	},
	onchange: function () {
		this.emitter.emit('change', { type: 'change' });
	},
	onremove: function () {
		this.emitter.emit('change', { type: 'remove' });
		this.up();
	}
};

module.exports = memoize.call(function (filename) {
	return new Watcher(filename);
}, [chain.call(String, resolve)]);