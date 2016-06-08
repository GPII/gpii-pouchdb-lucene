// Support comparisons where the actual value is a superset of the expected value.
//
// Useful in comparing pristine expected output to output that includes automatically generated cruft (IDs, etc.)
//
// We use this general pattern in a few places, this one is requires to handle the type of results returned by couchdb-lucene.
//
// We cannot simply use `jqUnit.assertLeftHand` because that comparison only considers the first level of depth and
// cannot handle both top-level comparisons (number of rows, metadata) and deeper comparisons in the "rows" array
// returned by Couch/Pouch.
//
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var jqUnit = require("node-jqunit");

fluid.registerNamespace("gpii.test.pouch.lucene");
gpii.test.pouch.lucene.assertSuperset = function (message, expected, actual) {
    // We use the change applier to detect changes.  If we attempt to apply `expected` to `actual`, and there are no
    // changes, it means that `actual` must be a superset of `expected`.
    //
    // We have to make two comparisons, one for the overall results, and one for the individual records.

    // Overall comparison
    var overallOptions = {changes: 0, unchanged: 0, changeMap: {}};
    fluid.model.applyHolderChangeRequest({ model: fluid.copy(actual)}, {value: fluid.copy(expected.overall), segs: [], type: "ADD"}, overallOptions);
    if (overallOptions.changes !== 0) {
        fluid.fail(message + "(overall comparison failed)...");
    }

    // Sanity check to confirm that the number of rows matches
    if (expected.rows.length !== actual.rows.length) {
        fluid.fail(message + "(row length comparison failed)...");
    }

    // Records comparison
    for (var a = 0; a < expected.rows.length; a++) {
        var expectedRecord = expected.rows[a];
        var actualRecord   = actual.rows[a];

        var recordOptions = {changes: 0, unchanged: 0, changeMap: {}};
        fluid.model.applyHolderChangeRequest({ model: actualRecord}, {value: fluid.copy(expectedRecord), segs: [], type: "ADD"}, recordOptions);

        if (recordOptions.changes !== 0) {
            fluid.fail(message + "(record " + a + " comparison failed)...");
        }
    }

    jqUnit.assertTrue(message, true);
};
