'use strict';

var partial = require('es5-ext/lib/Function/prototype/partial');

module.exports = {
	git: {
		filename: '.gitignore',
		globalRules: ['.git'],
		findRoot: partial.call(require('./find-root'), require('./is-gitrepo-root'))
	}
};
