'use strict';

var fork      = require('child_process').fork
  , lstatSync = require('fs').lstatSync
  , ee        = require('event-emitter')
  , sep       = require('../path/sep')

  , children = []
  , path = __dirname + sep + '_watch-fork-child.js'

  , watch, limit, addChild, emitters = {};

addChild = function () {
	var child = fork(path), data = { child: child, count: 0 };
	children.push(data);
	child.on('message', function (msg) {
		var emitter = emitters[msg.path];
		if (msg.event === 'end') {
			--data.count;
			delete emitters[msg.path];
		}
		emitter.emit(msg.event);
	});
};

watch = function (path) {
	var data, index;

	if (emitters[path]) {
		// Memoization out of a box
		return emitters[path];
	}

	// We need to throw immediately if path doesn't exist
	lstatSync(path);

	children.some(function (item, i) {
		if (item.count !== limit) {
			index = i;
			data = item;
			return true;
		}
	});
	data.child.send(path);

	if (++data.count === limit) {
		if (index == (children.length - 1)) {
			addChild();
		}
	}

	return (emitters[path] = ee());
};

module.exports = function (osLimit) {
	limit = osLimit;
	addChild();
	return watch;
};
