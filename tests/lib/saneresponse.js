// A common function to confirm that the response sent by the server meets our standards.
"use strict";
var fluid  = require("infusion");
var gpii   = fluid.registerNamespace("gpii");

require("../lib/superset");

fluid.registerNamespace("gpii.tests.pouch.lucene");
gpii.test.pouch.lucene.isSaneResponse = function (response, body, statusCode, expected) {
    gpii.test.express.helpers.isSaneResponse(response, body, statusCode);

    if (expected) {
        var jsonData = typeof body === "string" ? JSON.parse(body) : body;
        gpii.test.pouch.lucene.assertSuperset("The response should be as expected...", expected, jsonData);
    }
};
