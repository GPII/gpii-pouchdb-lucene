This package wraps [couchdb-lucene](https://github.com/rnewson/couchdb-lucene) so that it can be cleanly launched from
within a test runner.

# Requirements

When you first install this package, it will expect to be able to:

1. Clone the couchdb-lucene GIT repository
2. Reset the repository to a particular hash comnmit.
3. Build couchdb-lucene using Maven.

The build process will not work unless:

# git, maven, and java are installed and in your working path.
# your JAVA_HOME environment variable is set properly.

# How to use this package

The tests in this package demonstrate how to use this with a PouchDB instance.  Note that there is no mechanism to set
up couchdb-lucene as a proxy within PouchDB (as you would do with CouchDB).  Thus, your tests will need to query
couchdb-lucene directly.

The module generates all required configuration files based on whatever options you specify when
creating the module.  See the comments in the module code and the tests for clear examples.

# Changing the version of couchdb-lucene used.

If you would like to use a newer version of couchdb-lucene, you can remove the contents of the `build` directory and
run `node bin/build_couchdb_lucene.js` with whatever paths and versions you like.  run
`node bin/build_couchdb_lucene.js --help` for a list of supported options.

If you would like to update the default version, edit `configs/builderConf`, which controls the default builder options.
