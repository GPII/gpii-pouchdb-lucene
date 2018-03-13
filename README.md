This package wraps [couchdb-lucene](https://github.com/rnewson/couchdb-lucene) so that it can be cleanly launched from
within a test runner.

# Requirements

When you first install this package, it will expect to be able to:

1. Clone the couchdb-lucene GIT repository
2. Reset the repository to a particular hash comnmit.
3. Build couchdb-lucene using Maven.

The build process will not work unless:

1. git, maven, and java are installed and in your working path.
2. your JAVA_HOME environment variable is set properly.

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

# Indexing Strategies and Modern Versions of couchdb-lucene.

As of couchdb-lucene 2.0.0, sorting can no longer be accomplished using only a field name.  To work around this
limitation, you must first index any fields you wish to sort by in a sortable format (i.e. not "text"), as shown in 
this sample index:

```json
{
    "docs": [
        {
            "_id": "_design/lucene",
            "fulltext": {
                "by_content": {
                    "index": "function(doc) { var ret=new Document(); ret.add(doc.content); ret.add(doc.content, { field: \"name\", type: \"string\"} );return ret; }",
                    "defaults": {
                        "type": "text",
                        "store": "yes"
                    }
                },
                "analyzer": "perfield:{default:\"porter\", name: \"string\"}"
            }
        },
        { "content": "Alpha Cat"},
        { "content": "Bravo Dog"},
        { "content": "Charlie Cat"},
        { "content": "Delta Dog"}
    ]
}
```

The first call to `ret.add` ensures that the content will be indexed for full-text searching including with
stemming ("sit" also matches "sitting", for example).  The second call stores the same data as a string, which is
not suitable for full-text searching, but which can be used for sorting (see below).

When constructing search queries, you must also add the field type to the sort parameter.  If you launch the test
harness included with this package using a command like `node tests/js/launch-test-harness.js`, you can use the
following URL to search the sample data above, reverse sorted by name:

[http://localhost:3579//local/sample/_design/lucene/by_content?q=cat&sort=\name<string>](http://localhost:3579//local/sample/_design/lucene/by_content?q=cat&sort=\name<string>)

[See this issue](https://github.com/rnewson/couchdb-lucene/issues/248) for details on the underlying problem that
requires this workaround.