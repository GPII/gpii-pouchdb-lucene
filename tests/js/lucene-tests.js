// Sanity checks for search integration.  As these are read only, we use a single instance for all tests.
"use strict";
var fluid = fluid || require("infusion");
fluid.loadTestingSupport();
fluid.setLogging(true);

var gpii  = fluid.registerNamespace("gpii");

require("../../node_modules/gpii-express/tests/js/lib/test-helpers");

var jqUnit = require("node-jqunit");

var kettle = require("kettle");
kettle.loadTestingSupport();

require("./test-harness");
require("../lib/saneresponse");

fluid.registerNamespace("gpii.pouch.lucene.tests");

gpii.pouch.lucene.tests.expectNothing = function (){
    jqUnit.expect(0);
};

fluid.defaults("gpii.pouch.lucene.tests.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
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
                            listener: "gpii.pouch.lucene.tests.isSaneResponse",
                            event:    "{basicRequest}.events.onComplete",
                            args:     ["{basicRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.basic"]
                        },
                        {
                            func: "{testEnvironment}.harness.lucene.events.onReadyForShutdown.fire"
                        },
                        {
                            listener: "fluid.identity",
                            event:    "{testEnvironment}.harness.lucene.events.onShutdownComplete"
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
                            event:    "{sortedRequest}.events.onComplete",
                            args:     ["{sortedRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.sorted"]
                        },
                        {
                            func: "{testEnvironment}.harness.lucene.events.onReadyForShutdown.fire"
                        },
                        {
                            listener: "fluid.identity",
                            event:    "{testEnvironment}.harness.lucene.events.onShutdownComplete"
                        }
                    ]
                },
                {
                    name: "Test the process timeout...",
                    type: "test",
                    sequence: [
                        // There are no explicit assertions in this test, the fact that the last event is reached is enough.
                        // We have to let jqUnit know about this or it will throw its own error.
                        {
                            funcName: "gpii.pouch.lucene.tests.expectNothing"
                        },
                        {
                            func: "fluid.log",
                            args: ["pouchdb-lucene should time out after ", "{testEnvironment}.harness.lucene.options.processTimeout", " seconds..."]
                        },
                        {
                            listener: "fluid.identity",
                            event:    "{testEnvironment}.harness.lucene.events.onReadyForShutdown"
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
    gradeNames: ["fluid.test.testEnvironment"],
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
            type:          "gpii.pouch.lucene.tests.harness",
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
            type: "gpii.pouch.lucene.tests.caseHolder"
        }
    }
});

gpii.pouch.lucene.tests();