"use strict";
/*

    Many of these tasks are configured using variables defined in `package.json`.  Check that file for the actual
    settings.

*/

module.exports = function (grunt) {
    var pkg = grunt.file.readJSON("package.json");
    grunt.initConfig({
        pkg: pkg,
        eslint: {
            src: ["./src/**/*.js", "./tests/**/*.js", "./*.js"]
        },
        jsonlint: {
            src: ["tests/**/*.json", "./*.json"]
        },
        clean: [ "<%= pkg.config.srcDir %>" ],
        gitclone: {
            clone_couchdb_lucene: {
                options: {
                    cwd:        "<%= pkg.config.buildDir %>",
                    repository: "<%= pkg.config.url %>"
                }
            }
        },
        gitcheckout: {
            checkout_couchdb_lucene_hash: {
                options: {
                    cwd:    "<%= pkg.config.srcDir %>",
                    branch: "<%= pkg.config.hash %>"
                }
            }
        },
        shell: {
            couchdb_maven_build: {
                command: "mvn -q -D maven.test.skip=true",
                options: {
                    execOptions: {
                        cwd: "<%= pkg.config.srcDir %>"
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("fluid-grunt-eslint");
    grunt.loadNpmTasks("grunt-git");
    grunt.loadNpmTasks("grunt-jsonlint");
    grunt.loadNpmTasks("grunt-shell");

    grunt.registerTask("lint", "Apply jshint and jsonlint", ["eslint", "jsonlint"]);

    grunt.task.registerTask("build_couchdb_lucene", "Builds couchdb-lucene if needed.  Remove build/couchdb-lucene to force a fresh build.", function () {
        if (grunt.file.exists(pkg.config.zipPath)) {
            grunt.log.writeln("couchdb-lucene has already been built, skipping...");
        }
        else {
            grunt.log.writeln("Building couchdb-lucene...");
            grunt.task.run("clean", "gitclone", "gitcheckout", "shell");
        }
    });
};
