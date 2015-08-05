// Support comparisons where the actual value is a superset of the expected value.
//
// Useful in comparing pristine expected output to output that includes automatically generated cruft (IDs, etc.)
//
// We use this general pattern in a few places, this one is tailored to the type of results returned by couchdb-lucene.
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var jqUnit = require("jqUnit");

fluid.registerNamespace("gpii.pouch.lucene.tests");
gpii.pouch.lucene.tests.assertSuperset = function (message, expected, actual) {
    // We use the change applier to detect changes.  If we attempt to apply `expected` to `actual`, and there are no
    // changes, it means that `actual` must be a superset of `expected`.
    //
    // We have to make two comparisons, one for the overall results, and one for the individual records.

    // Overall comparison
    var overallOptions = {changes: 0, unchanged: 0, changeMap: {}};
    fluid.model.applyHolderChangeRequest({ model: fluid.copy(actual)}, {value: fluid.copy(expected.overall), segs: [], type: "ADD"}, overallOptions);
    jqUnit.assertTrue(message + "(overall comparison)", overallOptions.changes === 0);

    // Sanity check to confirm that the number of rows matches
    jqUnit.assertEquals(message + "(row length comparison)", expected.rows.length, actual.rows.length);

    // Records comparison
    for (var a = 0; a < expected.rows.length; a++) {
        var expectedRecord = expected.rows[a];
        var actualRecord   = actual.rows[a];

        var recordOptions = {changes: 0, unchanged: 0, changeMap: {}};
        fluid.model.applyHolderChangeRequest({ model: actualRecord}, {value: fluid.copy(expectedRecord), segs: [], type: "ADD"}, recordOptions);
        jqUnit.assertTrue(message + "(record " + a + " comparison)", recordOptions.changes === 0);
    }
};