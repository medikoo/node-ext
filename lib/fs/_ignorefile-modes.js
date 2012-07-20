'use strict';

var partial       = require('es5-ext/lib/Function/prototype/partial')
  , isGitrepoRoot = require('./is-gitrepo-root')
  , findRoot      = require('./find-root')

module.exports = {
	git: {
		filename: '.gitignore',
		globalRules: ['.git'],
		findRoot: partial.call(findRoot, isGitrepoRoot.isRoot),
		findRootWatch: partial.call(findRoot, isGitrepoRoot.watch)
	}
};
