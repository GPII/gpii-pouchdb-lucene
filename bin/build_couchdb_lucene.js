/*

    A script to (re)build couchdb-lucene on all platforms.  Created as an alternative to problematic Grunt
    "postinstall" steps, and built on top of gpii-launcher:

    https://github.com/GPII/gpii-launcher

    For a list of supported arguments, run this file with the `--help` argument.

    As outlined in the README, you must have both Java and maven installed for this script to perform its work.

 */
/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.setLogging(true);

require("gpii-launcher");

require("../");

var child_process = require("child_process");
var fs            = require("fs");
var rimraf        = require("rimraf");

fluid.registerNamespace("gpii.pouchdb.builder");

gpii.pouchdb.builder.checkForZip = function (that) {
    if (fs.existsSync(that.options.resolvedZipPath) && !that.options.clean) {
        fluid.log("Zip file '" + that.options.resolvedZipPath + "' already exists, skipping build...");
    }
    else {
        that.clean();
    }
};

gpii.pouchdb.builder.clean = function (that) {
    var contentToRemove = fluid.module.resolvePath(that.options.srcDir);
    rimraf(contentToRemove, function (error) {
        if (error) {
            that.events.onError.fire(error);
        }
        else {
            that.events.onClean.fire();
        }
    });
};

gpii.pouchdb.builder.execCommand = function (that, template, cmdOptions, eventName) {
    var command = fluid.stringTemplate(template, that.options);
    child_process.exec(command, cmdOptions, function (error) {
        if (error) {
            that.events.onError.fire(error);
        }
        else {
            that.events[eventName].fire();
        }
    });
};

fluid.defaults("gpii.pouchdb.builder", {
    gradeNames: ["fluid.component"],
    events: {
        onError: null,
        onClean: null,
        onClone: null,
        onCheckout: null,
        onBuild: null
    },
    resolvedBuildDir: "@expand:fluid.module.resolvePath({that}.options.buildDir)",
    resolvedSrcDir: "@expand:fluid.module.resolvePath({that}.options.srcDir)",
    resolvedZipPath: "@expand:fluid.module.resolvePath({that}.options.zipPath)",
    templates: {
        clone:    "git clone %url %resolvedSrcDir",
        checkout: "git checkout %hash",
        build:    "mvn -q -D maven.test.skip=true"
    },
    cmdOptions: {
        clone:    {
            cwd: "@expand:fluid.module.resolvePath({that}.options.buildDir)"
        },
        checkout: {
            cwd: "@expand:fluid.module.resolvePath({that}.options.srcDir)"
        },
        build:    {
            cwd: "@expand:fluid.module.resolvePath({that}.options.srcDir)"
        }
    },
    invokers: {
        clean: {
            funcName: "gpii.pouchdb.builder.clean",
            args:     ["{that}"]
        },
        clone: {
            funcName: "gpii.pouchdb.builder.execCommand",
            args:     ["{that}", "{that}.options.templates.clone", "{that}.options.cmdOptions.clone", "onClone"] // template, cmdOptions, eventName
        },
        checkout: {
            funcName: "gpii.pouchdb.builder.execCommand",
            args:     ["{that}", "{that}.options.templates.checkout", "{that}.options.cmdOptions.checkout", "onCheckout"] // template, cmdOptions, eventName
        },
        build: {
            funcName: "gpii.pouchdb.builder.execCommand",
            args:     ["{that}", "{that}.options.templates.build", "{that}.options.cmdOptions.build", "onBuild"] // template, cmdOptions, eventName
        }
    },
    listeners: {
        "onCreate.checkForZip": {
            funcName: "gpii.pouchdb.builder.checkForZip",
            args:     ["{that}"]
        },
        "onClean.clone": {
            func: "{that}.clone"
        },
        "onClone.checkout": {
            func: "{that}.checkout"
        },
        "onCheckout.build": {
            func: "{that}.build"
        },
        "onBuild.log": {
            funcName: "fluid.log",
            args:     ["Successfully built couchdb-lucene..."]
        },
        "onBuild.destroy": {
            priority: "after:log",
            func: "{that}.destroy"
        },
        "onError.fail": {
            funcName: "fluid.fail",
            args:     "{arguments}"
        }
    }
});

fluid.defaults("gpii.pouchdb.builder.launcher", {
    gradeNames: ["gpii.launcher"],
    yargsOptions: {
        describe: {
            url: "The URL to use when cloning couchdb-lucene from its repo.",
            hash: "The commit hash of couchdb-lucene to checkout.",
            buildDir: "The path to the build directory",
            clean: "Force a clean rebuild even if there is an existing ZIP file.",
            srcDir: "The path to the source directory.",
            zipPath: "The path to the final built ZIP file.",
            version: "The version to check out."
        },
        help: true,
        defaults: {
            optionsFile: "%gpii-pouchdb-lucene/configs/builderConf.json"
        }
    }
});

gpii.pouchdb.builder.launcher();
