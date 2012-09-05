'use strict';

module.exports = {
	close:              require('./close'),
	copy:               require('./copy'),
	copySync:           require('./copy-sync'),
	findRoot:           require('./find-root'),
	getTypeFromStat:    require('./get-type-from-stat'),
	isGitrepoRoot:      require('./is-gitrepo-root'),
	isIgnored:          require('./is-ignored'),
	open:               require('./open'),
	readFile:           require('./read-file'),
	readdir:            require('./readdir'),
	watch:              require('./watch'),
	watchPath:          require('./watch-path'),
	writeFile:          require('./write-file')
};
