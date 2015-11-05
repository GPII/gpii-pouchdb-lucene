// A common function to confirm that the response sent by the server meets our standards.
"use strict";
var fluid  = require("infusion");
var jqUnit = require("node-jqunit");
var gpii   = fluid.registerNamespace("gpii");

require("../lib/superset");

fluid.registerNamespace("gpii.pouch.lucene.tests");
gpii.pouch.lucene.tests.isSaneResponse = function (response, body, statusCode, expected) {
    statusCode = statusCode ? statusCode : 200;

    jqUnit.assertEquals("The response should have a reasonable status code", statusCode, response.statusCode);

    jqUnit.assertValue("There should be a body.", body);

    if (expected) {
        var jsonData = typeof body === "string" ? JSON.parse(body) : body;
        gpii.pouch.lucene.tests.assertSuperset("The response should be as expected...", expected, jsonData);
    }
};