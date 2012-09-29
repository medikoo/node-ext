'use strict';

module.exports = {
	copy:               require('./copy'),
	descriptorsHandler: require('./descriptors-handler'),
	findRoot:           require('./find-root'),
	getTypeFromStat:    require('./get-type-from-stat'),
	isGitrepoRoot:      require('./is-gitrepo-root'),
	isIgnored:          require('./is-ignored'),
	mkdir:              require('./mkdir'),
	readFile:           require('./read-file'),
	readdir:            require('./readdir'),
	watch:              require('./watch'),
	watchPath:          require('./watch-path'),
	writeFile:          require('./write-file')
};
