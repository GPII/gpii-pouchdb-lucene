// A wrapper to spin up an instance of couchdb-lucene for use in tests.  This is not intended for production use
// with CouchDB.
//
// The configuration options are:
//
// {
//   port:     "9999"                  // The port couchdb-lucene will run on
//   db: {
//     url:    "http://localhost:7986/" // The URL on which Pouch is running
//     nick:   "local",                // The "nickname" to use for the database when generating the configuration file.
// }
//
// NOTE:  This component cannot be used repeatedly in a `testCaseHolder` element without adding special steps to your
// test sequence.  Your first set of tests within a single `testCaseHolder` will generally succeed, but subsequent
// tests may:
//
// 1. Fail with messages about not being able to reach parts of a component that has already been destroyed.
// 2. Succeed, but generate messages about the port number already being in use.
// 3. Succeed, but only because they randomly managed to start up at the right time.
//
// To use multiple tests in a single `testCaseHolder`, your test sequences must:
//
// 1. Trigger an `onReadyForShutdown` event when you are finished with the rest of your sequence.
// 2. Listen for this component's `onShutdownComplete` event at the end of your test sequence.
//
// The end of your test sequence should look something like:
//
//    sequence: [
//        // Test something here
//        ...
//        // Tell pouchdb-lucene to shut down
//        {
//            func: "{gpii.pouch.lucene}.events.onReadyForShutdown.fire"
//        }
//        // Confirm that pouchdb-lucene is shut down
//        {
//            listener: "fluid.identity"
//            event:    "{gpii.pouch.lucene}.events.onShutdownComplete"
//        }
//    ]
//
// For more examples of using this component more than once in the same `testCaseHolder`, check out the tests in this
// package.
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var AdmZip        = require("adm-zip");
var path          = require("path");
var os            = require("os");
var fs            = require("fs");
var child_process = require("child_process");

// There are some constants that we use in `npm` scripts as well as here, they are found in `package.json`.
var npmSettings = require("../../package.json");

// Configure our directory locations based on the module location and the OS temporary directory.
var basePath = fluid.module.resolvePath("%gpii-pouchdb-lucene/");
var zipPath  = path.resolve(basePath, npmSettings.config.zipPath);
var tmpDir   = os.tmpdir();

var fs = require("fs");

fluid.registerNamespace("gpii.pouch.lucene");
gpii.pouch.lucene.init = function (that){
    // Use our ID as a unique identifier so that we can avoid clobbering another instance.
    var outputDir = path.resolve(that.options.tmpDir, that.id);

    // Unpack the "dist" zip created when we were installed to create a new working directory.
    fluid.log("Creating working directory for this instance...");
    fluid.log("output dir = " + outputDir);

    if (!fs.existsSync(that.options.zipPath)) {
        fluid.fail("The specified couchdb-lucene zip file doesn't exist: '" + that.options.zipPath + "'...");
    }

    var distZip = new AdmZip(that.options.zipPath);
    distZip.extractAllTo(outputDir);

    var workingDir = path.resolve(outputDir, "couchdb-lucene-" + npmSettings.config.version);
    var confFile    = path.resolve(workingDir, "conf", "couchdb-lucene.ini");

    fluid.log("Generating configuration file...");
    var iniContent = gpii.pouch.lucene.generateIniContent(that);
    fs.writeFileSync(confFile, iniContent);

    // Start the service using either the batch file on windows, or the shell script on anything else.
    fluid.log("Starting couchdb-lucene...");
    var script = os.platform().indexOf("win") === 0 ? "bin/run.bat" : "sh bin/run"; // The unix script is not always executable when it's unpacked.
    that.process = child_process.exec(script, { cwd: workingDir}, that.events.onShutdownComplete.fire);

    that.safetyTimeout = setTimeout(that.destroyOnTimeout, that.options.processTimeout);

    that.process.stdout.on("data", that.waitForStartup);
};

gpii.pouch.lucene.destroyOnTimeout = function (that) {
    fluid.log("Timeout reached for pouchdb lucene process, stopping it automatically...");
    that.events.onReadyForShutdown.fire(that);
};

// Ensure that the service is stopped on component destruction
gpii.pouch.lucene.stopProcess = function (that) {
    clearTimeout(that.safetyTimeout);

    if (that.process) {
        that.process.kill();
    }
};

// Monitor the process' logs for "Accepting connections" and fire an `onStarted` event when the service is ready to
// accept connections.
gpii.pouch.lucene.waitForStartup = function (that, chunk) {
    if (typeof chunk === "string" && chunk.indexOf("Accepting connections") !== -1) {
        // pouchdb-lucene is actually ready a few milliseconds after the log message we look for.
        setTimeout(function(){ that.events.onStarted.fire(that); }, that.options.startupDelay);
    }
    fluid.log(chunk);
};

gpii.pouch.lucene.generateIniContent = function(that) {
    var output = "";
    fluid.each(that.options.iniSettings, function(settings, section){
        output += "\n[" + section + "]\n";

        fluid.each(settings, function (value, key){
            output += key + "=" + value + "\n";
        });
    });

    return output;
};

fluid.defaults("gpii.pouch.lucene", {
    gradeNames:     ["fluid.component"],
    port:           9999,
    startupDelay:   250, // How long to wait before reporting that couchdb-lucene is ready.
    dbUrl:          "http://localhost:5986/ul",
    // As a safety measure, we will automatically kill our process after `processTimeout` milliseconds.
    processTimeout: 60000,
    // The settings we will write to couchdb-lucene's configuration file.  Each top level key will become a section
    // entry, as in [lucene].  Each sub key-value pair will become an entry, as in dir=indexes
    iniSettings: {
        lucene: {
            dir:                  "indexes",
            host:                 "localhost",
            port:                 "{that}.options.port",
            limit:                25,
            allowLeadingWildcard: false
        },
        local: {
            url:  "{that}.options.dbUrl"
        }
    },
    // The location of our distribution zip and working directory.  You should not need to change these.
    zipPath:     zipPath,
    tmpDir:      tmpDir,
    members: {
        process: false
    },
    events: {
        onStarted:          null,
        onReadyForShutdown: null,
        onShutdownComplete: null
    },
    listeners: {
        "onCreate.init": {
            funcName: "gpii.pouch.lucene.init",
            args:     ["{that}"]
        },
        "onReadyForShutdown.stopProcess": {
            funcName: "gpii.pouch.lucene.stopProcess",
            args:     ["{that}"]
        },
        "onStarted.log": {
            funcName: "fluid.log",
            args:     ["pouchdb-lucene started successfully..."]
        },
        "onReadyForShutdown.log": {
            funcName: "fluid.log",
            args:     ["pouchdb-lucene ready for shutdown..."]
        },
        "onShutdownComplete.log": {
            funcName: "fluid.log",
            args:     ["pouchdb-lucene shutdown complete..."]
        }
    },
    invokers: {
        waitForStartup: {
            funcName: "gpii.pouch.lucene.waitForStartup",
            args:     ["{that}", "{arguments}.0"]
        },
        destroyOnTimeout: {
            funcName: "gpii.pouch.lucene.destroyOnTimeout",
            args:     ["{that}"]
        }
    }
});