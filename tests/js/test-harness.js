// The common test harness we will use for all tests as well as manual verification.
"use strict";
var fluid = fluid || require("infusion");

require("../../index");
require("gpii-express"); // TODO:  gpii-pouch should bring this in for us.
require("gpii-pouch");

var path = require("path");
var sampleDataFile = path.resolve(__dirname, "../data/sample.json");

fluid.defaults("gpii.pouch.lucene.tests.harness", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    pouchPort:  "9753",
    baseUrl:    "http://localhost:9753", // TODO: Convert these to use template strings
    lucenePort: "3579",
    events: {
        onPouchStarted: null,
        onLuceneStarted: null,
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
                config: {
                    express: {
                        port: "{harness}.options.pouchPort",
                        baseUrl: "{harness}.options.baseUrl"
                    },
                    app: {
                        name: "Pouch Test Server",
                        url:  "{harness}.options.baseUrl"
                    }
                },
                listeners: {
                    onStarted: "{harness}.events.onExpressStarted.fire"
                },
                components: {
                    pouch: {
                        type: "gpii.pouch",
                        options: {
                            path: "/",
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
                port:  "{harness}.options.lucenePort",
                dbUrl: "{harness}.options.baseUrl",
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{harness}.events.onLuceneStarted.fire"
                    }
                }
            }
        }
    }
});