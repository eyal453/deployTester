exports.config = {
    // The address of a running selenium server.
    //seleniumAddress: 'http://127.0.0.1:4444/wd/hub',
    seleniumServerJar: '../../node_modules/protractor/selenium/selenium-server-standalone-2.47.1.jar',

    capabilities: {
        'browserName': 'chrome'
    },

    // Spec patterns are relative to the location of the spec file. They may
    // include glob patterns.
    suites: {
        //login: '../../scripts/e2e-tests/login/*-spec.js',
        //notification: '../../scripts/e2e-tests/notification-bar/*-spec.js',
        //portfolio: '../../scripts/e2e-tests/portfolio/*-spec.js',
        //projects: '../../scripts/e2e-tests/projects/*-spec.js',
    },
    //specs: ['../e2e-tests/**/*-spec.js'],


    onPrepare: function() {
        //setDelayForEachBrowserCall(200);
    },


    directConnect: true,


    jasmineNodeOpts: {
        showColors: true,
    }
};

function setDelayForEachBrowserCall(delay){
    var origFn = browser.driver.controlFlow().execute;

    browser.driver.controlFlow().execute = function() {
        var args = arguments;

        origFn.call(browser.driver.controlFlow(), function() {
            return protractor.promise.delayed(delay);
        });

        return origFn.apply(browser.driver.controlFlow(), args);
    };
}