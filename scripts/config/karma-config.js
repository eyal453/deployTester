module.exports = function(config) {
    config.set({
        // list of files / patterns to load in the browser

        // **/*.js: All files with a "js" extension in all subdirectories
        // **/!(jquery).js: Same as previous, but excludes "jquery.js"
        // **/(foo|bar).js: In all subdirectories, all "foo.js" or "bar.js" files

        files: [
            '../bower_components/jquery/dist/jquery.js',
            '../bower_components/angular/angular.js',
            '../bower_components/bootstrap/dist/js/bootstrap.js',
            '../bower_components/angular-animate/angular-animate.js',
            '../bower_components/angular-translate/angular-translate.js',
            '../bower_components/angular-bootstrap/ui-bootstrap.js',
            '../bower_components/angular-ui-router/release/angular-ui-router.js',
            '../bower_components/angular-mocks/angular-mocks.js',
            '../bower_components/lodash/lodash.js',
            '../bower_components/moment/moment.js',
            'utils/*.js',
            '**/*.js'
        ],
        exclude: [
            '**/protractor-config.js',
            '**/e2e-tests/**/*.js',
            '**/fake-server/*.js'
        ],

        browsers: [
            //'PhantomJS'
            ,'Chrome'
        ],

        // level of logging: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_WARN,

        // base path, that will be used to resolve files and exclude
        basePath: '../',

        // web server port
        port: 7676,

        // testing framework to use (jasmine/mocha/qunit/...)
        frameworks: ['jasmine'],

        // Additional reporters, such as growl, junit, teamcity or coverage
        reporters: ['progress'],

        // Continuous Integration mode, if true, it capture browsers, run tests and exit
        singleRun: false, // (set it in grunt file)

        // Set this for CI, in case its slow (SauceLabs)
        // captureTimeout: 120000,

        // enable / disable watching file and executing tests whenever any file changes
        // autoWatch: true, // (set it in grunt file)

        // Enable or disable colors in the output (reporters and logs).
        colors: true
    });
};
