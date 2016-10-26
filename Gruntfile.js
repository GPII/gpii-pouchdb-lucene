"use strict";
module.exports = function (grunt) {
    grunt.initConfig({
        eslint: {
            src: ["./src/**/*.js", "./tests/**/*.js", "./*.js"]
        },
        jsonlint: {
            src: ["tests/**/*.json", "./*.json"]
        }
    });

    grunt.loadNpmTasks("fluid-grunt-eslint");
    grunt.loadNpmTasks("grunt-jsonlint");

    grunt.registerTask("lint", "Apply jshint and jsonlint", ["eslint", "jsonlint"]);
};
