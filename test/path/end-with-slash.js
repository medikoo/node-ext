'use strict';

var normalize = require('../../lib/path/normalize')
  , separator = require('../../lib/path/separator');

module.exports = function (t, a) {
	a(t('raz/dwa/'), normalize('raz/dwa') + separator, "With ending slash");
	a(t('/raz/dwa'), normalize('/raz/dwa') + separator, "Without ending slash");
	a(t(''), '', "Empty");
	a(t('/'), separator, "Root");
};
