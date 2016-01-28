// A convenience script to start up a copy of the test harness for manual QA.
var fluid = require("infusion");
fluid.setLogging(true);

var gpii = fluid.registerNamespace("gpii");

require("./test-harness");

gpii.pouch.lucene.tests.harness({
    pouchPort:  "9999",
    baseUrl:    "http://localhost:9999", // TODO: Convert these to use template strings
    lucenePort: "3599"
});