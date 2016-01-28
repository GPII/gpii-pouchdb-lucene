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
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var AdmZip        = require("adm-zip");
var path          = require("path");
var os            = require("os");
var child_process = require("child_process");
var fs            = require("fs");

// There are some constants that we use in `npm` scripts as well as here, they are found in `package.json`.
var npmSettings = require("../../package.json");

// Configure our directory locations based on the module location and the OS temporary directory.
var basePath = fluid.module.resolvePath("%gpii-pouchdb-lucene/");
var zipPath  = path.resolve(basePath, npmSettings.config.zipPath);
var tmpDir   = os.tmpdir();

fluid.registerNamespace("gpii.pouch.lucene");

// Function to produce a single java command with all required options, to avoid using the batch file.
//
// If we don't do this, "our" child process will spawn a separate child process and we will have no way of knowing
// what process to kill when it's time to shut down.
//
gpii.pouch.lucene.generateWindowsCommandString = function (that) {
    var classpathSegments = ["conf"];

    /*
     for %%i in ("lib\*.jar") do @SET CLASSPATH=!CLASSPATH!;"%%~sdpfi"
     */
    var libJarSegments = fs.readdirSync(path.resolve(that.workingDir, "lib"));
    fluid.each(libJarSegments, function (segment) {
        classpathSegments.push(path.join("lib", segment));
    });
    var classpathString = classpathSegments.join(";");

    return "java -Xmx1g -Did=\"" + that.id + "\" -cp " + classpathString + " com.github.rnewson.couchdb.lucene.Main";
};

gpii.pouch.lucene.init = function (that) {
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

    that.workingDir = path.resolve(outputDir, "couchdb-lucene-" + npmSettings.config.version);
    var confFile   = path.resolve(that.workingDir, "conf", "couchdb-lucene.ini");

    fluid.log("Generating configuration file...");
    var iniContent = gpii.pouch.lucene.generateIniContent(that);
    fs.writeFileSync(confFile, iniContent);

    // Start the service using either the batch file on windows, or the shell script on anything else.
    fluid.log("Starting couchdb-lucene...");

    var isWindows = os.platform().indexOf("win") === 0;

    var shell     = isWindows ? "cmd.exe" : "sh";
    var args      = isWindows ? ["/c", gpii.pouch.lucene.generateWindowsCommandString(that)] : [path.resolve(that.workingDir, "bin/run")];

    that.process = child_process.spawn(shell, args, { cwd: that.workingDir });
    that.process.stdout.on("data", that.checkForStartupMessage); // Watch for "accepting connections", which means startup is complete

    // Display the child processes log messages on stdout/stderr.
    //
    // We have to pipe the streams created by the child process to their equivalents in `process` because
    // `process.stdout` and `process.stderr` are write only streams, and cannot be monitored for changes.
    //
    // Otherwise we would simply use the `inherit` option when we spawn the process.
    that.process.stdout.pipe(process.stdout);
    that.process.stderr.pipe(process.stderr);

    that.process.on("close", that.events.onShutdownComplete.fire);
};


// A function to find and stop the correct Windows process.  Uses `wmic` to look for `tag` in the command line
// arguments.  Best practice is to include the component ID in the command line arguments and then search for that.
//
fluid.registerNamespace("gpii.windows");
gpii.windows.stopNamedAndTaggedProcess = function (processName, processTag) {
    var pidLookupCommand = "wmic process where \"name='" + processName + "' and commandline like '%" + processTag + "%'\" get processid";
    child_process.exec(pidLookupCommand, function (error, stdout) {
        if (error) {
            fluid.fail("Error looking up Windows process ID:\n" + error);
        }
        else {
            /*
             Extract the PID from output like:

             ProcessId
             4452

             */
            var pidExtractionRegex = /.*([0-9]+).*/;
            var outputString = stdout.toString();
            var matches = outputString.match(pidExtractionRegex);

            if (matches) {
                process.kill(matches[0], "SIGKILL");
            }
            else {
                fluid.fail("Unable to find process ID in command output:\n" + outputString);
            }
        }
    });
};

gpii.pouch.lucene.stopProcess = function (that) {
    if (that.process) {
        // Hello, cruel Windows.
        if (os.platform().indexOf("win") === 0) {
            gpii.windows.stopNamedAndTaggedProcess("java.exe", that.id);
        }
        else {
            that.process.kill();
        }
    }
};

gpii.pouch.lucene.checkForStartupMessage = function (that, data) {
    if (data && data.toString().indexOf("Accepting connections") !== -1) {
        // Stop monitoring the log file for changes
        that.process.stdout.removeListener("data", that.checkForStartupMessage);

        // pouchdb-lucene is actually ready a few milliseconds after the log message we look for.
        setTimeout(function () { that.events.onStarted.fire(that); }, that.options.startupDelay);
    }
};

gpii.pouch.lucene.generateIniContent = function (that) {
    var output = "";
    fluid.each(that.options.iniSettings, function (settings, section) {
        output += "\n[" + section + "]\n";

        fluid.each(settings, function (value, key) {
            output += key + "=" + value + "\n";
        });
    });

    return output;
};

fluid.defaults("gpii.pouch.lucene", {
    gradeNames:     ["fluid.component"],
    port:           9999,
    pollInterval:   250,
    startupDelay:   250, // How long to wait before reporting that couchdb-lucene is ready.
    dbUrl:          "http://localhost:5986/ul",
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
        process:   false
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
        checkForStartupMessage: {
            funcName: "gpii.pouch.lucene.checkForStartupMessage",
            args:     ["{that}", "{arguments}.0"] // the callback is passed: data
        }
    }
});