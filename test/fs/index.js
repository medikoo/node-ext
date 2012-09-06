'use strict';

var indexTest = require('tad/lib/utils/index-test')
  , dir       = require('path').resolve(__dirname, '../../lib/fs');

module.exports = indexTest(indexTest.readDir(dir)(function (o) {
	delete o.descriptorLimiter;
	return o;
}));
