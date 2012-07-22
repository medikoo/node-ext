'use strict';

var partial       = require('es5-ext/lib/Function/prototype/partial')
  , isGitrepoRoot = require('./is-gitrepo-root')
  , FindRoot      = require('./find-root').FindRoot

module.exports = {
	git: {
		filename: '.gitignore',
		globalRules: ['.git'],
		findRoot: function (path) {
			var finder = new FindRoot(path);
			finder.isRoot = isGitrepoRoot.isRoot;
			finder.next();
			return finder.promise;
		},
		findRootWatch: function (path) {
			var finder = new FindRoot(path, true);
			finder.isRoot = isGitrepoRoot.watch;
			finder.next();
			return finder.promise;
		}
	}
};
