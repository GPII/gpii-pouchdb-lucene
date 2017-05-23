// The common test harness we will use for all tests as well as manual verification.
"use strict";
var fluid = require("infusion");

require("../../index");

require("gpii-express");

require("gpii-pouchdb");

var path = require("path");
var sampleDataFile = path.resolve(__dirname, "../data/sample.json");

fluid.defaults("gpii.tests.pouch.lucene.harness", {
    gradeNames: ["fluid.component"],
    ports: {
        pouch:  "9753",
        lucene: "3579"
    },
    baseUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args: ["http://admin:admin@localhost:%port", { port: "{that}.options.ports.pouch"}]
        }
    },
    events: {
        onReadyToDie:     null,
        onPouchStarted:   null,
        onLuceneStarted:  null,
        onExpressStarted: null,
        onStarted: {
            events: {
                onPouchStarted:   "onPouchStarted",
                onLuceneStarted:  "onLuceneStarted",
                onExpressStarted: "onExpressStarted"
            }
        }
    },
    components: {
        pouch: {
            type: "gpii.express",
            options: {
                port: "{harness}.options.ports.pouch",
                baseUrl: "{harness}.options.baseUrl",
                listeners: {
                    onStarted: "{harness}.events.onExpressStarted.fire"
                },
                components: {
                    pouch: {
                        type: "gpii.pouch.express",
                        options: {
                            path: "/",
                            // The following whisks away the inherited options that would disable the leaky "changes"
                            // endpoint. Turns out couchdb-lucene searches will fail with overly vague "not found"
                            // errors if that endpoint is not present.
                            distributeOptions: {
                                source:       "{that}.options.expressPouchConfig.overrideMode",
                                target:       "{that}.options.devNull",
                                removeSource: true
                            },
                            expressPouchConfig: {
                                logPath: "{that}.options.expressPouchLogPath"
                            },
                            databases: {
                                "sample":   { "data": sampleDataFile }
                            },
                            listeners: {
                                "onStarted.notifyParent": {
                                    func: "{harness}.events.onPouchStarted.fire"
                                }
                            }
                        }
                    }
                }
            }
        },
        lucene: {
            type: "gpii.pouch.lucene",
            options: {
                port:           "{harness}.options.ports.lucene",
                dbUrl:          "{harness}.options.baseUrl",
                processTimeout: 4000,
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{harness}.events.onLuceneStarted.fire"
                    }
                }
            }
        }
    }
});
