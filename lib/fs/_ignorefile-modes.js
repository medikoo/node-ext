'use strict';

var partial       = require('es5-ext/lib/Function/prototype/partial')
  , isGitrepoRoot = require('./is-gitrepo-root')
  , FindRoot      = require('./find-root').FindRoot

module.exports = {
	git: {
		filename: '.gitignore',
		globalRules: ['.git'],
		isRoot: isGitrepoRoot.isRoot,
		isRootWatch: isGitrepoRoot.watch
	}
};
