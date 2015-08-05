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

// Pick up the default location for the "dist" zip file we will unpack before we launch.
var zipPath     = path.resolve(__dirname, "../..", npmSettings.config.srcDir, "target");
var zipFilename = "couchdb-lucene-" + npmSettings.config.version + "-dist.zip";
var tmpDir      = os.tmpdir();


fluid.registerNamespace("gpii.pouch.lucene");
gpii.pouch.lucene.init = function (that){
    // Use our ID as a unique identifier so that we can avoid clobbering another instance.
    var outputDir = path.resolve(that.options.tmpDir, that.id);

    // Unpack the "dist" zip created when we were installed to create a new working directory.
    fluid.log("Creating working directory for this instance...");
    fluid.log("output dir = " + outputDir);

    var zipFile = path.resolve(that.options.zipPath, that.options.zipFilename);
    var distZip = new AdmZip(zipFile);
    distZip.extractAllTo(outputDir);

    var workingDir = path.resolve(outputDir, "couchdb-lucene-" + npmSettings.config.version);
    var confFile    = path.resolve(workingDir, "conf", "couchdb-lucene.ini");

    fluid.log("Generating configuration file...");
    var iniContent = gpii.pouch.lucene.generateIniContent(that);
    fs.writeFileSync(confFile, iniContent);

    // Start the service using either the batch file on windows, or the shell script on anything else.
    fluid.log("Starting couchdb-lucene...");
    var script = os.platform().indexOf("win") === 0 ? "bin/run.bat" : "sh bin/run"; // The unix script is not always executable when it's unpacked.
    that.process = child_process.exec(script, { cwd: workingDir}), that.handleProcessExit;

    that.process.stdout.on('data',that.waitForStartup);
};

// Ensure that the service is stopped on component destruction
gpii.pouch.lucene.stopProcess = function (that) {
    if (that.process) {
        that.process.kill();
    }
};

gpii.pouch.lucene.handleProcessExit = function (that, error, stdout) {
    if (error) {
        fluid.fail(error);
    }
    else {
        fluid.log(stdout);
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
    gradeNames:   ["fluid.eventedComponent", "autoInit"],
    port:         9999,
    startupDelay: 250, // How long to wait before reporting that couchdb-lucene is ready.
    dbUrl:        "http://localhost:5986/ul",
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
    zipFilename: zipFilename,
    tmpDir:      tmpDir,
    members: {
        process: false
    },
    events: {
        onStarted: null
    },
    listeners: {
        "onCreate.init": {
            funcName: "gpii.pouch.lucene.init",
            args:     ["{that}"]
        },
        "onDestroy.stopProcess": {
            funcName: "gpii.pouch.lucene.stopProcess",
            args:     ["{that}"]
        },
        "onStarted.log": {
            funcName: "fluid.log",
            args:     ["pouchdb-lucene started successfully..."]
        }
    },
    invokers: {
        handleProcessExit: {
            funcName: "gpii.pouch.lucene.handleProcessExit",
            args:     ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        },
        waitForStartup: {
            funcName: "gpii.pouch.lucene.waitForStartup",
            args:     ["{that}", "{arguments}.0"]
        }
    }
});