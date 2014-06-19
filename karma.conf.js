/**
 * Created by Gert on 6/16/2014.
 */
module.exports = function (config) {
	config.set({
		basePath: '',
		files: [
			'bower_components/angular/angular.js',
			'bower_components/angular-sanitize/angular-sanitize.js',
			'bower_components/angular-mocks/angular-mocks.js',
			'*.spec.js',
			'*.js'
		],

		reporters: ['progress'],

		port: 9876,
		colors: true,

		logLevel: config.LOG_INFO,

		browsers: ['PhantomJS'],
		frameworks: ['jasmine'],

		captureTimeout: 60000,

		autoWatch: true,
		singleRun: false
	});
};