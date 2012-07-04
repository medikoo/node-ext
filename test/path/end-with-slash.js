'use strict';

var join = require('path').join
  , sep  = require('../../lib/path/sep');

module.exports = function (t, a) {
	a(t('raz/dwa/'), join('raz/dwa') + sep, "With ending slash");
	a(t('/raz/dwa'), join('/raz/dwa') + sep, "Without ending slash");
	a(t(''), '', "Empty");
	a(t('/'), sep, "Root");
};
