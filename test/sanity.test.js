var assert = require('assert');
var _ = require('@sailshq/lodash');
var adapter = require('../');

var DRY_ORM = {
  models: {
    foo: {
      identity: 'foo',
      tableName: 'the_foo',
      primaryKey: 'id',
      attributes: {
        id: {
          columnName: 'the_id',
          autoMigrations: { columnType: 'DOESNT_MATTER', unique: true, autoIncrement: true },
        },
        beep: {
          columnName: 'the_beep',
          required: true,// ««« IMPORTANT!  In our tests, we have to make sure and ensure this requiredness ourselves, since we're calling the adapter directly and can't rely on Waterline's help
          autoMigrations: { columnName: 'beep', columnType: '_number', unique: true },
        },
        boop: {
          columnName: 'the_boop',
          defaultsTo: '',// ««« IMPORTANT!  In our tests, we have to take care of this ourselves, since we're calling the adapter directly and can't rely on Waterline's help
          allowNull: true,
          autoMigrations: { columnName: 'boop', columnType: '_string' }
        }
      }//</.attributes>
    }//</.foo>
  }//</.models>
};//</DRY_ORM>


describe('sanity', function(){//eslint-disable-line prefer-arrow-callback
  this.slow(250);
  var dbTestUrls = [
    process.env.SAILS_SQL_TEST_1,// e.g. 'mysql://root@localhost/mppg',
    process.env.SAILS_SQL_TEST_2,// e.g. 'pg://root@localhost/mppg',
    process.env.SAILS_SQL_TEST_3,// e.g. 'mssql://root@localhost/mppg',
    process.env.SAILS_SQL_TEST_4,// e.g. 'sqlite3://root@localhost/mppg',
    process.env.SAILS_SQL_TEST_5,// e.g. 'oracledb://root@localhost/mppg',
  ].filter((url) => !!url );
  if (dbTestUrls.length === 0) {
    throw new Error(`Please specify at least one database to test against.\ne.g.\nSAILS_SQL_TEST_1='mysql://root:p4ssw0rdRc00l@localhost:3306/foo' npm test`);
  }

  // Keep track of managers to help the tests more-gracefully tidy themselves up.
  var mgrs = [];

  after(async()=>{
    for (let mgr of mgrs) {
      await adapter.ƒ.destroyManager(mgr);
    }//∞
  });//œ

  for (let dbUrl of dbTestUrls) {
    describe(dbUrl.match(/^([^:/]+)\:/)[1], ()=>{
      it('should support creating a manager, grabbing connections, releasing one, and then destroying the manager', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl, (err)=>{
          console.warn('*********** *********** *********** warn: onUnexpectedFailure notifier function was triggered:', err);
        })).manager;
        mgrs.push(mgr);
        // console.log('* ** * Got manager:', mgr);
        var firstConnection = (await adapter.ƒ.getConnection(mgr)).connection;
        // console.log('* ** * Got first connection:', firstConnection);
        await adapter.ƒ.getConnection(mgr);
        // console.log('* ** * Got another connection:', firstConnection);
        await adapter.ƒ.getConnection(mgr);
        await adapter.ƒ.releaseConnection(firstConnection);
        // console.log('* ** * Released first connection');
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
        // console.log('* ** * Destroyed manager');
      });//</it>
      it('should support querying, and relevant errors should have the "noSuchPhysicalModel" footprint', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var queryFailureErr;
        var unusedResult = await adapter.ƒ.sendNativeQuery(db, 'SELECT * FROM notarealtable')
        .tolerate('queryFailed', (err)=>{
          // console.log('* got error:', err);
          let report = err.raw;
          queryFailureErr = report.error;
        });
        // console.log('**', unusedResult);
        assert(queryFailureErr);
        assert.equal('noSuchPhysicalModel', (await adapter.ƒ.parseNativeQueryError(queryFailureErr)).footprint.identity);
        // ^Note that this tests adherence to the "noSuchPhysicalModel" footprint
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support transactions', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db1 = (await adapter.ƒ.getConnection(mgr)).connection;
        await adapter.ƒ.beginTransaction(db1);
        // await adapter.ƒ.sendNativeQuery(db1, 'SELECT * FROM notarealtable').tolerate('queryFailed');
        await adapter.ƒ.commitTransaction(db1);
        // var db2 = (await adapter.ƒ.getConnection(mgr)).connection;
        // await adapter.ƒ.beginTransaction(db2);
        // await adapter.ƒ.sendNativeQuery(db2, 'SELECT * FROM notarealtable').tolerate('queryFailed');
        // await adapter.ƒ.rollbackTransaction(db2);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support auto-migrations', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        await adapter.ƒ.dropPhysicalModel(db, 'the_foo');
        await adapter.ƒ.definePhysicalModel(db, 'the_foo', [
          { columnName: 'the_id', columnType: 'DOESNT_MATTER', unique: true, autoIncrement: true },
          { columnName: 'the_beep', columnType: '_number', unique: true },
          { columnName: 'the_boop', columnType: '_string' },
        ]);
        await adapter.ƒ.setPhysicalSequence(db, 'the_foo_id_seq', 1000);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support inserting a record (+"fetch")', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var firstResult = await adapter.ƒ.createRecord({
          method: 'create',
          using: 'the_foo',
          newRecord: {
            the_boop: '',//eslint-disable-line camelcase
            the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
          }
        }, db, DRY_ORM);
        assert(!firstResult);
        var secondBeep = 1553039660680.3054;//«Note that, instead of a random number, we use one that we know is problematic (when it comes to the decimal column type in MSSQL, anyway)
        var secondResult = await adapter.ƒ.createRecord({
          method: 'create',
          using: 'the_foo',
          newRecord: {
            the_boop: '',//eslint-disable-line camelcase
            the_beep: secondBeep//eslint-disable-line camelcase
          },
          meta: { fetch: true }
        }, db, DRY_ORM);
        assert(secondResult);
        assert.equal(secondResult.the_beep, secondBeep, `Expected value in result from database to match the value provided when creating.  But secondResult.the_beep is ${secondResult.the_beep}  whereas the value provided when creating was ${secondBeep}`);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support batch inserting many records (+"fetch")', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var firstResult = await adapter.ƒ.createEachRecord({
          method: 'createEach',
          using: 'the_foo',
          newRecords: [
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            }
          ],
        }, db, DRY_ORM);
        assert(!firstResult);
        var eighthBeep = (Date.now()+Math.random());
        var secondResult = await adapter.ƒ.createEachRecord({
          method: 'createEach',
          using: 'the_foo',
          newRecords: [
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: eighthBeep//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            }
          ],
          meta: { fetch: true }
        }, db, DRY_ORM);
        assert(secondResult);
        assert.equal(secondResult[1].the_beep, eighthBeep, `Expected value in result from database to match the value provided when creating.  But secondResult[1].the_beep is ${secondResult[1].the_beep}  whereas the value provided when creating was ${eighthBeep}`);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support running two count queries, with consistent results', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var total = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof total === 'number');
        await adapter.ƒ.createRecord({
          method: 'create',
          using: 'the_foo',
          newRecord: {
            the_boop: '',//eslint-disable-line camelcase
            the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
          }
        }, db, DRY_ORM);
        var newTotal = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof newTotal === 'number');
        assert.equal(newTotal, total + 1);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support running two sum queries, with consistent results', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var sumTotal = await adapter.ƒ.sumRecords({ method: 'sum', using: 'the_foo', numericAttrName: 'the_beep', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof sumTotal === 'number');
        var amountToAdd = (Date.now()+Math.random());
        await adapter.ƒ.createRecord({
          method: 'create',
          using: 'the_foo',
          newRecord: {
            the_boop: '',//eslint-disable-line camelcase
            the_beep: amountToAdd//eslint-disable-line camelcase
          }
        }, db, DRY_ORM);
        var newSumTotal = await adapter.ƒ.sumRecords({ method: 'sum', using: 'the_foo', numericAttrName: 'the_beep', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof newSumTotal === 'number');
        assert(newSumTotal === sumTotal + amountToAdd);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support running two avg queries, with consistent results', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var firstAvg = await adapter.ƒ.avgRecords({ method: 'avg', using: 'the_foo', numericAttrName: 'the_beep', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof firstAvg === 'number');
        var originalNumRecords = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        var valInNewRecord = (Date.now()+Math.random());
        await adapter.ƒ.createRecord({
          method: 'create',
          using: 'the_foo',
          newRecord: {
            the_boop: '',//eslint-disable-line camelcase
            the_beep: valInNewRecord//eslint-disable-line camelcase
          }
        }, db, DRY_ORM);
        var secondAvg = await adapter.ƒ.avgRecords({ method: 'avg', using: 'the_foo', numericAttrName: 'the_beep', criteria: { where: {} } }, db, DRY_ORM);
        assert(typeof secondAvg === 'number');
        var expectedDisplacement = (firstAvg-valInNewRecord)/(originalNumRecords+1);
        var expectedSecondAvg = firstAvg+expectedDisplacement;
        var stdDeviation = Math.sqrt((Math.pow(expectedSecondAvg - ((secondAvg + expectedSecondAvg) / 2), 2) + Math.pow(secondAvg - ((secondAvg + expectedSecondAvg) / 2), 2))/2);
        var accuracy = 100 - ((stdDeviation / ((secondAvg + expectedSecondAvg) / 2)) * 100);
        assert(accuracy > 99);
        // ^^ for an explanation of how this is computed and why we can't just check
        // that the expected second average is the same as the first (hint: floating point math),
        // see https://github.com/mikermcneil/sails-sql/blob/23393cffc88e2ba357d61d8cc8341a80a00dc497/test/sanity.test.js#L209-L229
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support finding all records and sorting them', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var records = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: {}, select: ['*'], limit: Number.MAX_SAFE_INTEGER, skip: 0, sort: [{the_beep: 'ASC'}] } }, db, DRY_ORM);//eslint-disable-line camelcase
        var numRecords = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        assert(Array.isArray(records));
        assert.equal(records.length, numRecords);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support finding a subset of records using limit and skip', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        var someRecords = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: {}, select: ['*'], limit: 3, skip: 1, sort: [{the_id: 'DESC'}] } }, db, DRY_ORM);//eslint-disable-line camelcase
        assert(Array.isArray(someRecords));
        assert.equal(someRecords.length, 3);
        var numRecords = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        var someMoreRecords = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: {}, select: ['*'], limit: 3, skip: numRecords-2, sort: [{the_id: 'ASC'}] } }, db, DRY_ORM);//eslint-disable-line camelcase
        assert(Array.isArray(someMoreRecords));
        assert.equal(someMoreRecords.length, 2);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support finding a subset of records using where', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        await adapter.ƒ.createEachRecord({
          method: 'createEach',
          using: 'the_foo',
          newRecords: [
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: 99999999//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: 88888888//eslint-disable-line camelcase
            },
            {
              the_boop: null,//eslint-disable-line camelcase
              the_beep: 77777777//eslint-disable-line camelcase
            },
            {
              the_boop: null,//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: 'asdfg',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            },
            {
              the_boop: '',//eslint-disable-line camelcase
              the_beep: (Date.now()+Math.random())//eslint-disable-line camelcase
            }
          ]
        }, db, DRY_ORM);
        var records = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: { or: [ {the_beep: 77777777}, {the_beep: 99999999}, {the_beep: 88888888}, {the_boop: null} ] }, select: ['*'], limit: Number.MAX_SAFE_INTEGER, skip: 0, sort: [{the_beep: 'ASC'}] } }, db, DRY_ORM);//eslint-disable-line camelcase
        assert(Array.isArray(records));
        assert.equal(records.length, 4);
        var otherRecords = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: { and: [ {the_boop:{'!=': null}}, { or: [ {the_beep: 77777777}, {the_beep: 99999999}, {the_beep: 88888888} ] } ] }, select: ['*'], limit: Number.MAX_SAFE_INTEGER, skip: 0, sort: [{the_beep: 'ASC'}] } }, db, DRY_ORM);//eslint-disable-line camelcase
        assert(Array.isArray(otherRecords));
        assert.equal(otherRecords.length, 2);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support updating all records', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        await adapter.ƒ.updateRecords({ method: 'update', using: 'the_foo', valuesToSet: { the_boop: 'hello world!' }, criteria: { where: {} } }, db, DRY_ORM);//eslint-disable-line camelcase
        var allRecords = await adapter.ƒ.findRecords({ method: 'find', using: 'the_foo', criteria: { where: {}, select: ['*'], limit: 3, skip: 1, sort: [] } }, db, DRY_ORM);
        assert(allRecords.every((record)=>record['the_boop'] === 'hello world!'));
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
      it('should support destroying all records', async()=>{
        var mgr = (await adapter.ƒ.createManager(dbUrl)).manager;
        mgrs.push(mgr);
        var db = (await adapter.ƒ.getConnection(mgr)).connection;
        await adapter.ƒ.destroyRecords({ method: 'destroy', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        var numRecords = await adapter.ƒ.countRecords({ method: 'count', using: 'the_foo', criteria: { where: {} } }, db, DRY_ORM);
        assert.equal(numRecords, 0);
        await adapter.ƒ.destroyManager(mgr);
        mgrs = _.difference(mgrs, [mgr]);
      });//</it>
    });//</describe (protocol prefix)>
  }//∞  </ each connection URL >
});//∂
