// Sanity checks for search integration.  As these are read only, we use a single instance for all tests.
"use strict";

var events = require("events");
events.EventEmitter.defaultMaxListeners = 100;

var fluid = require("infusion");
fluid.loadTestingSupport();
fluid.setLogging(true);

var gpii  = fluid.registerNamespace("gpii");

require("./test-harness");
require("../lib/saneresponse");

var kettle = require("kettle");
kettle.loadTestingSupport();

require("gpii-express");
gpii.express.loadTestingSupport();


fluid.defaults("gpii.tests.pouch.lucene.caseHolder", {
    gradeNames: ["gpii.test.express.caseHolder"],
    sequenceEnd: [
        {
            func: "{testEnvironment}.harness.lucene.events.onReadyForShutdown.fire"
        },
        {
            listener: "fluid.identity",
            event:    "{testEnvironment}.harness.lucene.events.onShutdownComplete"
        }
    ],
    expected: {
        // Because of limitations when comparing array data, we have to split each expected set of results into pieces,
        // one piece that can be compared with the overall results (overall), and one piece that can be compared to
        // the "rows" data (rows).
        basic: {
            overall: { "total_rows": 2 },
            rows: [{ "fields": { "default": "Alpha Cat" } }, { "fields": { "default": "Charlie Cat" } }]
        },
        sorted: {
            overall: { "total_rows": 2 },
            rows: [{ "fields": { "default": "Charlie Cat" } }, { "fields": { "default": "Alpha Cat" } }]
        }
    },
    // Our raw test cases, that will have `sequenceStart` prepended before they are run.
    rawModules: [
        {
            name: "Testing pouchdb-lucene...",
            tests: [
                {
                    //name: "Testing a basic search...",
                    name: "Testing lucene search integration...",
                    type: "test",
                    sequence: [
                        {
                            func: "{basicRequest}.send"
                        },
                        {
                            listener: "gpii.test.pouch.lucene.isSaneResponse",
                            event:    "{basicRequest}.events.onComplete",
                            args:     ["{basicRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.basic"]
                        }
                    ]
                },
                {
                    name: "Testing a sorted search...",
                    type: "test",
                    sequence: [
                        {
                            func: "{sortedRequest}.send"
                        },
                        {
                            listener: "gpii.test.pouch.lucene.isSaneResponse",
                            event:    "{sortedRequest}.events.onComplete",
                            args:     ["{sortedRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.sorted"]
                        }
                    ]
                }
            ]
        }
    ],

    components: {
        basicRequest: {
            type: "kettle.test.request.http",
            options: {
                path:   "/local/sample/_design/lucene/by_content?q=cat",
                port:   "{testEnvironment}.options.lucenePort",
                method: "GET"
            }
        },
        sortedRequest: {
            type: "kettle.test.request.http",
            options: {
                path:   "/local/sample/_design/lucene/by_content?q=cat&sort=\\default",
                port:   "{testEnvironment}.options.lucenePort",
                method: "GET"
            }
        }
    }
});


fluid.defaults("gpii.tests.pouch.lucene", {
    gradeNames: ["fluid.test.testEnvironment"],
    hangWait:   20000,
    pouchPort:  "9998",
    baseUrl:    {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["http://localhost:%port", { port: "{that}.options.pouchPort"}]
        }
    },
    lucenePort: "3598",
    events: {
        constructServer: null,
        onStarted:       null
    },
    components: {
        harness: {
            type:          "gpii.tests.pouch.lucene.harness",
            createOnEvent: "constructServer",
            options: {
                pouchPort:  "{testEnvironment}.options.pouchPort",
                baseUrl:    "{testEnvironment}.options.baseUrl",
                lucenePort: "{testEnvironment}.options.lucenePort",
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{testEnvironment}.events.onStarted.fire"
                    }
                }
            }
        },
        testCaseHolder: {
            type: "gpii.tests.pouch.lucene.caseHolder"
        }
    }
});

fluid.test.runTests("gpii.tests.pouch.lucene");