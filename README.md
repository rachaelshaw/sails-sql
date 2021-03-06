# Sails SQL Adapter

## THIS IS A WORK IN PROGRESS UNDER ACTIVE DEVELOPMENT - DO NOT USE IN PRODUCTION  (targeting 2019 for the first stable release w/ 3 out of 5 dialects)

SQL adapter for [Node.js/Sails](https://sailsjs.com) and [Waterline](http://waterlinejs.org). Supports MySQL, ~~PostgreSQL~~ _(PostgreSQL is under construction)_, and Microsoft SQL Server (MSSQL) databases.

> This adapter is compatible with Node ≥8 and up.  For SQL adapters compatible with older versions of Node.js, see legacy adapters [sails-mysql](https://npmjs.com/package/sails-mysql) and [sails-postgresql](https://npmjs.com/package/sails-postgresql).

<a target="_blank" href="http://www.mysql.com"><img src="http://www.mysql.com/common/logos/powered-by-mysql-125x64.png" alt="Powered by MySQL" width="120px" title="MySQL adapter for Node.js/Sails"/></a>
<a target="_blank" href="https://www.postgresql.org"><img src="http://sm.pcmag.com/t/pcmag_ru/help/p/postgresql/postgresql-94-funktsii-tekhnologii-vozmozhnosti_3nyj.640.jpg" width="140px" alt="PostgreSQL logo" title="Postgresql adapter for Node.js/Sails"/></a>
<a target="_blank" href="https://www.microsoft.com/en-us/sql-server"><img src="https://dirkstrauss.com/wp-content/uploads/2014/01/script-table-data.jpg" width="120px" alt="Microsoft SQL Server logo" title="MSSQL: Microsoft SQL Server (MSSQL) adapter for Node.js/Sails"/></a>


## Running the tests

Run the tests with the `SAILS_SQL_TEST_1` environment variable set to the database connection URL of an empty/throwaway database you'd like to use for testing.

If you have more than one empty/throwaway database you'd like to test against, you can include multiple URLs to run the tests back to back:

For example:

```bash
SAILS_SQL_TEST_1='mssql://root:s3cr3td4nc3@127.0.0.1:8181/somethrowawaydb' SAILS_SQL_TEST_2='mysql://root:s3cr3td4nc3@127.0.0.1:3306/anotherthrowaway' npm test
```

## Acknowledgements

Thanks to [dougwilson](https://github.com/dougwilson) and [felixge](https://github.com/felixge) for all of their great work on [mysql](http://npmjs.com/package/mysql), [@brianc](https://github.com/brianc) for all of his fantastic work on the [`pg`](http://npmjs.com/package/pg) package, and thousands of contributors across the Node.js community that have made this level of simplicity and abstraction possible.

## Help

For more examples, or if you get stuck or have questions, click [here](https://sailsjs.com/support).

## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/sails-sql.svg)](http://npmjs.com/package/sails-sql)

To report a bug, [click here](https://sailsjs.com/bugs).


## Contributing &nbsp; [![Build Status](https://travis-ci.org/sailshq/sails-sql.svg?branch=master)](https://travis-ci.org/sailshq/sails-sql)

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](https://sailsjs.com/contribute) when opening issues or submitting pull requests.

[![NPM](https://nodei.co/npm/sails-sql.png?downloads=true)](http://npmjs.com/package/sails-sql)

### Other SQL databases

The eventual goal for this adapter is to support all of knex's supported databases, including SQLite and Oracle.  (If you are using one of those databases for a real-world project, please contribute!)

<a target="_blank" href="https://www.sqlite.org/index.html"><img src="https://www.sqlite.org/images/sqlite370_banner.gif" width="120px" alt="SQLite" title="SQLite: SQLite adapter for Node.js/Sails"/></a>
<a target="_blank" href="https://www.oracle.com/database/index.html"><img src="https://user-images.githubusercontent.com/618009/40745346-d9221d68-641c-11e8-8bf9-3ccded0d24c0.png" width="120px" alt="Oracle" title="Oracle adapter for Node.js/Sails"/></a>


## License

MIT &copy; 2018-present [Mike McNeil](https://twitter.com/mikermcneil)

This package, like the [Sails framework](https://sailsjs.com), is free and open-source under the [MIT License](https://sailsjs.com/license).


## Implementor notes (advanced)

### About MySQL
Support for different types of managers is database-specific, and is not
built into the Waterline driver spec-- however this type of configurability
can be instrumented using `meta`.

In particular, support for ad-hoc connections (i.e. no pool) and clusters/multiple
pools (see "PoolCluster": https://github.com/felixge/node-mysql/blob/v2.10.2/Readme.md#poolcluster)
could be implemented here, using properties on `meta` to determine whether or not
to have this manager produce connections ad-hoc, from a pool, or from a cluster of pools.

Feel free to fork this driver and customize as you see fit.  Also note that
contributions to the core driver in this area are welcome and greatly appreciated!

Also note that if this driver is adapted to support managers which spawn
ad-hoc connections or manage multiple pools/replicas using PoolCluster,
then relevant settings would need to be included in the manager instance
so that the manager could be appropriately destroyed here (in the case of
ad-hoc connections, leased connections would need to be tracked on the
manager, and then rounded up and disconnected here.)

For now, since we only support a single pool, we simply destroy it.

For more info, see https://github.com/felixge/node-mysql/blob/v2.10.2/Readme.md#closing-all-the-connections-in-a-pool

### About getConnection()

Note that if this driver is adapted to support managers which spawn
ad-hoc connections or manage multiple pools/replicas using PoolCluster,
then relevant settings would need to be included in the manager instance
so that connections can be appropriately fetched/opened here.
For now, since we only support a single pool, we simply acquire a
connection from the pool.

### About releaseConnection()

Note that if this driver is adapted to support managers which spawn
ad-hoc connections or manage multiple pools/replicas using PoolCluster,
then relevant settings would need to be included in the manager instance
so that connections can be appropriately released/destroyed in releaseConnection.

For now, since we only support a single pool, we simply release the
connection back to the pool. And if the connection cannot be released back to
the pool gracefully, we try to force it to disconnect.

If releaseConnection() succeeds, then we were either able to release
the connection gracefully (i.e. worked on the first try), or that we
had to try again, forcibly destroying the connection.
