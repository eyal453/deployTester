'use strict';

var gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    clean = require('gulp-clean'),
    glob = require('glob'),
    zip = require('gulp-zip'),
    es = require('event-stream'),
    ts = require('gulp-typescript'),
    runSequence = require('run-sequence'),
    less = require('gulp-less'),
    path = require('path'),
    minifyCSS = require('gulp-minify-css'),
    concatCss = require('gulp-concat-css'),
    series = require('stream-series'),
    inject = require('gulp-inject'),
    bowerFiles = require('main-bower-files'),
    watch = require('gulp-watch'),
    batch = require('gulp-batch'),
    templateCache = require('gulp-angular-templatecache'),
    concat = require('gulp-concat'),
    prompt = require('gulp-prompt'),
    replace = require('gulp-replace'),
    yargs = require('yargs'),
    exists = require('path-exists').sync,
    Server = require('karma').Server,
    fileStream = require('fs'),
    webserver = require('gulp-webserver'),
    protractor = require("gulp-protractor").protractor,
    exit = require("gulp-exit"),
    realNock = require('./scripts/fake-server/real-nock'),
    fakeServerConfig = require('./scripts/config/fake-server-config');

var ORIG = 'scripts/';
var ORIG_STYLES = 'styles/';
var ORIG_IMAGES = 'images/';
var DEST = 'build/';
var UNPACKED = 'unpacked/';
var LIB = 'lib/';
var DEST_SCRIPTS = DEST + 'scripts/';
var DEST_STYLES = DEST + 'styles/';
var DEST_IMAGES = DEST + 'images/';
var DEST_FONTS = DEST_STYLES + 'fonts/';
var APP_NAME = "codeResource";
var VERSION_PATH = DEST + "version.txt";

var version = new Date().getTime();

gulp.task("clean", function () {
    return gulp.src(DEST, { read: false }).
        pipe(clean());
});

gulp.task("transpile", function () {
    var tsResult = gulp.src(ORIG + '**/*.ts')
        .pipe(ts({
            noImplicitAny: true
        }));
    return tsResult.js
        .pipe(gulp.dest(ORIG))
        .pipe(gulp.dest(DEST_SCRIPTS + UNPACKED));
});

gulp.task("bundle-js", function () {
    return gulp.src([DEST_SCRIPTS + UNPACKED + '/**/*.min.js', "!" + DEST_SCRIPTS + UNPACKED + '/**/*-tests.min.js'])
        .pipe(concat('all.bundle.js'))
        .pipe(gulp.dest(DEST_SCRIPTS));
});

gulp.task('min-uglify', function () {
    return gulp.src(DEST_SCRIPTS + UNPACKED + '**/*.js')
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(DEST_SCRIPTS + UNPACKED));
});

gulp.task('less', function () {
    return gulp.src([ORIG_STYLES + '/**/*.less', '!' + ORIG_STYLES + '/**/mixins.less'])
        .pipe(less({
            paths: [path.join(__dirname, 'less', 'includes')]
        }))
        .pipe(gulp.dest(ORIG_STYLES))
        .pipe(gulp.dest(DEST_STYLES + UNPACKED))
        .pipe(concatCss("all.min.css"))
        .pipe(minifyCSS())
        .pipe(gulp.dest(DEST_STYLES));
});

gulp.task("images", function () {
    return gulp.src(ORIG_IMAGES + '**/*.*').pipe(gulp.dest(DEST_IMAGES));
});

gulp.task("fonts", function () {
    return gulp.src(bowerFiles('**/fonts/*.*')).pipe(gulp.dest(DEST_FONTS));
});

gulp.task("html", function () {
    return gulp.src("index.html")
        .pipe(rename({ basename: "index", suffix: "-debug" }))
        .pipe(gulp.dest(DEST))
        .pipe(rename({ basename: "index", suffix: "-release" }))
        .pipe(gulp.dest(DEST));
});

gulp.task("inject-html-debug", function () {
    // These stream variables are ordered by the way they should be injected into the HTML file
    var appStream = gulp.src([
        DEST_SCRIPTS + UNPACKED + '*.js',
        '!' + DEST_SCRIPTS + UNPACKED + '*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'templatescache.js'
    ], { read: false });
    var configStream = gulp.src([DEST_SCRIPTS + UNPACKED + 'config/*.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'config/karma-config.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'config/protractor-config.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'config/fake-server-config.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'config/*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'config/*-tests.js'], { read: false });
    var serviceStream = gulp.src([DEST_SCRIPTS + UNPACKED + 'services/**/*.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'services/**/*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'services/**/*-tests.js'], { read: false });
    var utilsStream = gulp.src([DEST_SCRIPTS + UNPACKED + 'utils/**/*.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'utils/**/*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'utils/**/*-tests.js'], { read: false });
    var filterStream = gulp.src([DEST_SCRIPTS + UNPACKED + 'filters/*.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'filters/**/*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'filters/**/*-tests.js'], { read: false });
    var componentStream = gulp.src([DEST_SCRIPTS + UNPACKED + 'components/**/*.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'components/**/*.min.js',
        '!' + DEST_SCRIPTS + UNPACKED + 'components/**/*-tests.js'], { read: false });
    var appCssStream = gulp.src([DEST_STYLES + UNPACKED + '*.css', '!' + DEST_STYLES + UNPACKED + '*.min.css'], { read: false });

    var vendorJsStream = gulp.src(bowerFiles('**/*.js')).pipe(gulp.dest(DEST_SCRIPTS + LIB));
    var vendorCssStream = gulp.src(bowerFiles('**/*.css')).pipe(gulp.dest(DEST_STYLES + LIB));

    return gulp.src(DEST + 'index-debug.html')
        .pipe(inject(vendorJsStream, { name: 'bower', relative: true }))
        .pipe(inject(vendorCssStream, { name: 'bower', relative: true }))
        .pipe(inject(series(appStream, configStream, utilsStream, serviceStream, filterStream, componentStream, appCssStream), {
            relative: true,
            transform: appendVersionTransform
        }))
        .pipe(gulp.dest(DEST));
});

function appendVersionTransform(filePath) {
    arguments[0] = filePath + '?v=' + version;
    return inject.transform.apply(inject.transform, arguments);
}

gulp.task("inject-original-html-debug", function () {

    //var version = fileStream.readFileSync(VERSION_PATH, "utf8");

    // These stream variables are ordered by the way they should be injected into the HTML file
    var appStream = gulp.src([ORIG + '*.js', '!' + ORIG + 'templatescache.js'], { read: false });
    var configStream = gulp.src([ORIG + 'config/*.js',
        "!" + ORIG + 'config/karma-config.js',
        "!" + ORIG + 'config/protractor-config.js',
        "!" + ORIG + 'config/fake-server-config.js'], { read: false });
    var utilsStream = gulp.src([ORIG + 'utils/**/*.js',
        "!" + ORIG + 'utils/**/*-tests.js'], { read: false });
    var serviceStream = gulp.src([ORIG + 'services/**/*.js',
        "!" + ORIG + 'services/**/*-tests.js'], { read: false });
    var filterStream = gulp.src([ORIG + 'filters/*.js',
        "!" + ORIG + 'filters/*-tests.js'], { read: false });
    var componentStream = gulp.src([ORIG + 'components/**/*.js',
        "!" + ORIG + 'components/**/*-tests.js'], { read: false });
    var appCssStream = gulp.src(ORIG_STYLES + '*.css', { read: false });

    return gulp.src("index.html")
        .pipe(rename({ basename: "index", suffix: "-debug" }))
        .pipe(inject(gulp.src(bowerFiles(), { read: false }), { name: 'bower', relative: true }))
        .pipe(inject(series(appStream, configStream, utilsStream, serviceStream, filterStream, componentStream, appCssStream), {
            relative: true,
            transform: appendVersionTransform,
            name: 'inject'
        }))
        .pipe(gulp.dest("./"));
});

gulp.task("inject-html-release", function () {
    var appStream = gulp.src(DEST_SCRIPTS + 'all.bundle.js', { read: false });
    var appCssStream = gulp.src(DEST_STYLES + 'all.min.css', { read: false });

    var vendorCssStream = gulp.src(getMinifiedBowerFiles('**/*.css')).pipe(gulp.dest(DEST_STYLES + LIB));
    var vendorJsStream = gulp.src(getMinifiedBowerFiles('**/*.js')).pipe(gulp.dest(DEST_SCRIPTS + LIB));

    return gulp.src(DEST + 'index-release.html')
        .pipe(inject(vendorCssStream, { name: 'bower', relative: true }))
        .pipe(inject(vendorJsStream, { name: 'bower', relative: true }))
        .pipe(inject(series(appStream, appCssStream), { relative: true, transform: appendVersionTransform }))
        .pipe(gulp.dest(DEST));
});

function getMinifiedBowerFiles(filter) {
    var minifiedPath = bowerFiles(filter).map(function (oldPath) {
        var newPath = oldPath.replace(/.([^.]+)$/g, '.min.$1');
        if (exists(newPath)) {
            return newPath;
        }

        //try to find minified version in subdirectories
        var candidates = glob.sync(path.dirname(newPath) + "/**/" + path.basename(newPath));
        if (candidates && candidates.length) {
            return candidates[0];
        }

        console.log(newPath + " was not found!!!");
        return oldPath;
    });

    return minifiedPath;
}

gulp.task('add-typescript-references', function () {
    return gulp.src('./scaffold-templates/_references-template.ts.txt')
        .pipe(rename('_references.d.ts'))
        .pipe(inject(gulp.src([ORIG + "**/*.ts", '!' + ORIG + '_references.d.ts'], { read: false }), {
            relative: true,
            starttag: '// automatic-references start',
            endtag: '// automatic-references end',
            transform: function (filepath) {
                return '/// <reference path="' + filepath + '"/>';
            }
        }))
        .pipe(gulp.dest(ORIG));
});

gulp.task('on-file-add-or-remove', function (cb) {
    runSequence('add-typescript-references', 'inject-original-html-debug');
});

gulp.task('bundle-templates', function () {
    return gulp.src(ORIG + '**/*.html')
        .pipe(templateCache('templatescache.js', { module: APP_NAME,root:'scripts'  }))
        .pipe(gulp.dest(DEST_SCRIPTS + UNPACKED))
        .pipe(gulp.dest(ORIG));
});

gulp.task('tests',function(done){
   new Server({
       configFile:__dirname + '/scripts/config/karma-config.js'
   },function(){
       done();
   }).start(); 
});

gulp.task('test-once', function (done) {
    new Server({
        configFile: __dirname + '/scripts/config/karma-config.js',
        singleRun: true
    }, function () {
        done();
    }).start();
});

gulp.task("version", function () {
    fileStream.mkdirSync(DEST);
    fileStream.writeFileSync(VERSION_PATH, version);
});

gulp.task('kill-server', function () {
    return gulp.src('.').pipe(webserver()).emit('kill');
});

gulp.task('protractor-run', function (done) {
    return gulp.src([])
        .pipe(protractor({
            configFile: "./scripts/config/protractor-config.js",
            args: ['--baseUrl', 'http://127.0.0.1:9000']
        }))
        .on('error', function (e) {
            throw e
        })
});

// RUNNABLE TASKS

// Task: gulp default OR gulp
// The default task which "builds" the system (transpiling, minifcation, bundling and more).
// The output is put within the build directory.
gulp.task('default', function (cb) {
    runSequence('clean', 'version',
        'add-typescript-references', 'transpile',
        'bundle-templates', 'min-uglify', 'bundle-js',
        ['less', 'images', 'fonts', 'html'],
        ['inject-original-html-debug', 'inject-html-debug', 'inject-html-release'],
        'deploy', cb);
});

// Task: gulp with-tests
// An extension to the default tasks. Does everything that the default task does (transpiling, minifcation, bundling and more).
// In addition, unit tests and end to end tests are executed as well.
gulp.task('with-tests', function (cb) {
    runSequence('default', 'test-once', 'e2e-tests', cb);
});

// Task: gulp mock-server
// Runs the API server mock
gulp.task('mock-server', function () {
    fakeServerConfig.configureFakeServer(realNock);
});

gulp.task('qdev', function () {
    gulp.watch(ORIG + '**/*.ts', ['add-typescript-references', 'transpile']);
    gulp.watch(ORIG_STYLES + '**/*.less', ['less']);
    // return gulp.src(ORIG + '**/*.ts')
    //     .pipe(watch(ORIG+'**/*'))
    //     .pipe(ts({
    //         noImplicitAny: true,
    //     }))
    //     .pipe(gulp.dest(ORIG));
})

// Task: gulp watch
// Watches the directory for addition or removal of typescript files.
// Whenever one is added/removed, typescript references are updated
// In addition templates cache is generated whenever any html file is added/removed/changed
gulp.task('watch', function () {
    watch('**/*.ts',
        { events: ['add', 'unlink'] },
        batch(function (events, done) {
            gulp.start('add-typescript-references', done);
        }));

    watch('**/*.ts',
        { events: ['add', 'change'] },
        batch(function (events, done) {
            gulp.start('transpile', done);
        }));

    watch('**/*.html',
        batch(function (events, done) {
            gulp.start('bundle-templates', done);
        }));
});

// Task: gulp tdd
// Watches for changes in files and reruns the tests whenever a change occurs
gulp.task('tdd', function (done) {
    new Server({
        configFile: __dirname + '/scripts/config/karma-config.js'
    }, done).start();
});

// Task: gulp server
// Runs the application web server
gulp.task('server', function () {
    return gulp.src('.')
        .pipe(webserver({
            livereload: false,
            directoryListing: false,
            port: 9000,
            fallback: 'index-debug.html',
            open: false
        }));
});

// Task: gulp e2e-tests
// Executes all end-to-end tests of the application
gulp.task('e2e-tests', function (cb) {
    runSequence('server', 'mock-server', 'protractor-run', 'kill-server', function () {
        gulp.src("").pipe(exit());
        cb();
    });
});

gulp.task("deploy",function(){
    return gulp.src("build")
        .pipe(zip("deploy.zip"))
        .pipe(gulp.dest("."));
})

// Task: gulp s
// Used to scaffold new objects in the system (components and services at the moment)
gulp.task("s", function () {
    var argv = yargs.argv;

    var type = argv.t || argv.type;
    var name = argv.n || argv.name;

    if (type && name) { // Use command line arguments
        scaffold(type, name);
    } else { // Ask the user for data
        return gulp.src("*")
            .pipe(prompt.prompt({
                type: 'checkbox',
                name: 'objType',
                message: 'What would you like to add?',
                choices: ['Component', 'Service', 'View']
            }, function (res) {
                gulp.src("*")
                    .pipe(prompt.prompt({
                        type: 'input',
                        name: 'objName',
                        message: res.objType + ' name (camelCase please)?'
                    }, function (res1) {
                        scaffold(res.objType[0], res1.objName);
                    }));
            }));
    }

    function scaffoldComponent(name, dashedName, titleCaseName, isView) {
        var entityName = isView ? 'view' : 'component';
        // Create ts file
        gulp.src('./scaffold-templates/' + entityName + '-template.ts.txt')
            .pipe(replace('##name##', name))
            .pipe(replace('##titleCaseName##', titleCaseName))
            .pipe(replace('##dashedName##', dashedName))
            .pipe(rename(dashedName + '.ts'))
            .pipe(gulp.dest(ORIG + 'components/' + (isView ? 'views/' : '') + dashedName + '/'));

        // Create test file
        gulp.src('./scaffold-templates/' + entityName + '-test-template.ts.txt')
            .pipe(replace('##name##', name))
            .pipe(replace('##titleCaseName##', titleCaseName))
            .pipe(replace('##dashedName##', dashedName))
            .pipe(rename(dashedName + '-tests.ts'))
            .pipe(gulp.dest(ORIG + 'components/' + (isView ? 'views/' : '') + dashedName + '/'));

        // Create html file
        gulp.src('./scaffold-templates/' + entityName + '-template.html.txt')
            .pipe(rename(dashedName + '.html'))
            .pipe(gulp.dest(ORIG + 'components/' + (isView ? 'views/' : '') + dashedName + '/'));
    }

    function scaffold(type, name) {
        var dashedName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        var titleCaseName = name[0].toUpperCase() + name.substring(1);

        switch (type.toLowerCase()) {
            case 'view':
                scaffoldComponent(name, dashedName, titleCaseName, true);
                break;
            case 'component':
                scaffoldComponent(name, dashedName, titleCaseName, false);
                break;
            case 'service':
                // Create ts file
                gulp.src('./scaffold-templates/service-template.ts.txt')
                    .pipe(replace('##name##', name))
                    .pipe(replace('##titleCaseName##', titleCaseName))
                    .pipe(replace('##dashedName##', dashedName))
                    .pipe(rename(dashedName + '.ts'))
                    .pipe(gulp.dest(ORIG + 'services/' + dashedName + '/'));

                // Create test file
                gulp.src('./scaffold-templates/service-test-template.ts.txt')
                    .pipe(replace('##name##', name))
                    .pipe(replace('##titleCaseName##', titleCaseName))
                    .pipe(replace('##dashedName##', dashedName))
                    .pipe(rename(dashedName + '-tests.ts'))
                    .pipe(gulp.dest(ORIG + 'services/' + dashedName + '/'));
                break;
        }
    }
});