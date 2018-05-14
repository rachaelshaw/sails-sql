





### MySQL implementation notes
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

For more info, see:
 • https://github.com/felixge/node-mysql/blob/v2.10.2/Readme.md#closing-all-the-connections-in-a-pool

### getConnection() notes

Note that if this driver is adapted to support managers which spawn
ad-hoc connections or manage multiple pools/replicas using PoolCluster,
then relevant settings would need to be included in the manager instance
so that connections can be appropriately fetched/opened here.
For now, since we only support a single pool, we simply acquire a
connection from the pool.

### releaseConnection() notes

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
