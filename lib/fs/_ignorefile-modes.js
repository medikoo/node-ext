'use strict';

var isGitrepoRoot = require('./is-gitrepo-root');

module.exports = {
	git: {
		filename: '.gitignore',
		globalRules: ['.git'],
		isRoot: isGitrepoRoot.basic,
		isRootWatch: isGitrepoRoot.watch
	}
};
