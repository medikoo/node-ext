'use strict';

module.exports = {
	"With ending slash": function (t, a) {
		a.equal(t('raz/dwa/'), 'raz/dwa');
	},
	"Without ending slash": function (t, a) {
		a.equal(t('/raz/dwa'), '/raz/dwa');
	},
	"Empty": function (t, a) {
		a.equal(t(''), '');
	}
};
