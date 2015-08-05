// Sanity checks for search integration.  As these are read only, we use a single instance for all tests.
"use strict";
var fluid = fluid || require("infusion");
fluid.setLogging(true);

var gpii  = fluid.registerNamespace("gpii");

// We use just the request-handling bits of the kettle stack in our tests, but we include the whole thing to pick up the base grades
require("../../node_modules/kettle");
require("../../node_modules/kettle/lib/test/KettleTestUtils");

require("./test-harness");
require("../lib/sequence");
require("../lib/saneresponse");

fluid.registerNamespace("gpii.pouch.lucene.tests");

fluid.defaults("gpii.pouch.lucene.tests.caseHolder", {
    gradeNames: ["fluid.test.testCaseHolder", "autoInit"],
    // TODO: Review with Antranig.  We are use `assertLeftHand` for these, but the left-handedness is too shallow to inspect actual records.
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
    mergePolicy: {
        rawModules:    "noexpand",
        sequenceStart: "noexpand"
    },
    moduleSource: {
        funcName: "gpii.lucene.pouch.tests.addRequiredSequences",
        args:     ["{that}.options.sequenceStart", "{that}.options.rawModules"]
    },
    sequenceStart: [
        { // This sequence point is required because of a QUnit bug - it defers the start of sequence by 13ms "to avoid any current callbacks" in its words
            func: "{testEnvironment}.events.constructServer.fire"
        },
        {
            listener: "fluid.identity",
            event:    "{testEnvironment}.events.onReady"
        }
    ],
    // Our raw test cases, that will have `sequenceStart` prepended before they are run.
    rawModules: [
        {
            // TODO:  Review this once we have an approach to ensuring that Pouch can be safely launched multiple times from a single test harness.
            tests: [
                {
                    name: "Testing a basic search...",
                    type: "test",
                    sequence: [
                        {
                            func: "{basicRequest}.send"
                        },
                        {
                            listener: "gpii.pouch.lucene.tests.isSaneResponse",
                            event: "{basicRequest}.events.onComplete",
                            args: ["{basicRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.basic"]
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
                            listener: "gpii.pouch.lucene.tests.isSaneResponse",
                            event: "{sortedRequest}.events.onComplete",
                            args: ["{sortedRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.sorted"]
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


fluid.defaults("gpii.pouch.lucene.tests", {
    gradeNames: ["fluid.test.testEnvironment", "autoInit"],
    pouchPort:  "9998",
    baseUrl:    "http://localhost:9998", // TODO: Convert these to use template strings
    lucenePort: "3598",
    events: {
        constructServer: null,
        onReady:         null
    },
    components: {
        harness: {
            type:          "gpii.pouch.lucene.tests.harness",
            createOnEvent: "constructServer",
            options: {
                pouchPort:  "{testEnvironment}.options.pouchPort",
                baseUrl:    "{testEnvironment}.options.baseUrl",
                lucenePort: "{testEnvironment}.options.lucenePort",
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{testEnvironment}.events.onReady.fire"
                    }
                }
            }
        },
        testCaseHolder: {
            type: "gpii.pouch.lucene.tests.caseHolder"
        }
    }
});

gpii.pouch.lucene.tests();