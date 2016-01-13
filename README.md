This package wraps [couchdb-lucene](https://github.com/rnewson/couchdb-lucene) so that it can be cleanly launched from
within a test runner.

When you first install this package, it will expect to be able to:

1. Clone the couchdb-lucene GIT repository
2. Reset the repository to a particular hash comnmit.
3. Build couchdb-lucene using Maven.

You must have both Maven and Java available to install this script.  You must have Java available to actually launch
couchdb-lucene.  At the time I am writing this, Java 1.7 is required in order to be able to build this.

If you require a newer version of couchdb-lucene, you will need to update the configuration variables in `package.json`
and re-run `npm install`.

## Windows instructions

On Windows, you must not only install maven and java, but you must:

1. Set the JAVA_HOME environment variable, otherwise the initial build will fail.
2. Include your maven binary directory in your PATH environment variable, otherwise the initial build will fail.
3. Inlude your java binary directory in your PATH environment variable, otherwise the launch of the couchdb-lucene process will fail.


# How to use this package

The tests in this package demonstrate how to use this with a PouchDB instance.  Note that there is no mechanism to set
up couchdb-lucene as a proxy within PouchDB (as you would do with CouchDB).  Thus, your tests will need to query
couchdb-lucene directly.

The module generates all required configuration files based on whatever options you specify when
creating the module.  See the comments in the module code and the tests for clear examples.