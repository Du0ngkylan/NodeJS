'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs-extra');
const sqlite = require('sqlite');

// define const
const BOOKRACK_MODULE = '../../../bookrack-accessor.js';
const GOYO19_APP_FOLDER = path.join(__dirname, '../../..', 'tests/test_data/data_test_import_construction');

const CONSTRUCTION_ID = 1;
const ALBUM_ID = 4;

const ALBUM_DIR = path.join(GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID, "/bookrack/album1");
const MASTERDB = path.join(GOYO19_APP_FOLDER, 'masterDB.db');
const BOOKRACKDB = path.join(GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID, '/bookrack/bookrackDB.db');
const ALBUMDB = path.join(ALBUM_DIR, 'albumDB.db');

test.beforeEach(async t => {
  // This runs before each test
  let sourceTestData = path.join(__dirname, '../../..', 'tests/test_data/Goyo19');
  await copyTestData(sourceTestData, GOYO19_APP_FOLDER);
  await updateDatabase();
});

test.afterEach.always('guaranteed cleanup',async t => {
  fs.removeSync(GOYO19_APP_FOLDER);
});

// // get album detail with full settings
// // Normal case
// test.serial('InportConstruction_JapanPathSuccsess', async t => {

//   // create fixtrue
//   let sourceTestData = path.join(__dirname, '../../..', 'tests/test_data/Goyo19');
//   let japanesePathAppData = path.join(GOYO19_APP_FOLDER, ".." , 'データ/data_test_import_construction');
//   await fs.removeSync(japanesePathAppData);
//   await copyTestData(sourceTestData, japanesePathAppData);

//   testInportConstructionUtil.initialize(t);
//   const TARGET = require(BOOKRACK_MODULE);
//   TARGET.initialize(japanesePathAppData);
//   TARGET.once('abort', testInportConstructionUtil.onAbort)
//   TARGET.once('error', testInportConstructionUtil.onError);
//   try {
//     //Create fixture
//     let dataFolder = path.join(japanesePathAppData, "construction0");
//     await TARGET.importConstruction(dataFolder);
//     t.deepEqual(true, fs.existsSync(path.join(japanesePathAppData, "construction3")));
//     // compare
//     t.pass('InportConstruction_JapanPathSuccsess');
//   } catch (e) {
//     console.log(e);
//     t.fail('InportConstruction_JapanPathSuccsess');
//   } finally {
//     await TARGET.finalize();
//     TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
//     TARGET.removeListener('error', testInportConstructionUtil.onError);
//     let japanesePathAppData = path.join(GOYO19_APP_FOLDER, ".." , 'データ');
//     await fs.removeSync(japanesePathAppData);
//   }
// });

// get album detail with full settings
// Normal case
test.serial('InportConstruction_ConstructionExisted', async t => {

  // create fixtrue
  testInportConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testInportConstructionUtil.onAbort)
  TARGET.once('error', testInportConstructionUtil.onError);
  try {
    //Create fixture
    let dataFolder = path.join(GOYO19_APP_FOLDER, "construction1");
    await TARGET.importConstruction(dataFolder);
    t.fail('InportConstruction_Succsess');
    console.log(e);
  } catch (e) {
    // compare
    t.deepEqual(testInportConstructionUtil.constructionExisted.type, e.type);
    t.deepEqual(testInportConstructionUtil.constructionExisted.message, e.message);
    t.pass('InportConstruction_Succsess');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
    TARGET.removeListener('error', testInportConstructionUtil.onError);
  }
});

// get album detail with full settings
// Normal case
test.serial('InportConstruction_Succsess', async t => {

  // create fixtrue
  testInportConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testInportConstructionUtil.onAbort)
  TARGET.once('error', testInportConstructionUtil.onError);
  try {
    //Create fixture
    let dataFolder = path.join(GOYO19_APP_FOLDER, "construction0");
    let { constructionId } = await TARGET.importConstruction(dataFolder);
    t.deepEqual(constructionId, 3);
    // compare
    t.pass('InportConstruction_Succsess');
  } catch (e) {
    console.log(e);
    t.fail('InportConstruction_Succsess');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
    TARGET.removeListener('error', testInportConstructionUtil.onError);
  }
});

// Test case
// accessor test should be done in serial
// abnormal case
test.serial('InportConstruction_NotFoundDataDir', async t => {
  testInportConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize();
  TARGET.once('abort', testInportConstructionUtil.onAbort);
  TARGET.once('error', testInportConstructionUtil.onError);
  try {
    await TARGET.deleteAlbum();
    t.fail('Failed InportConstruction_NotFoundDataDir');
  } catch (e) {
    testInportConstructionUtil.verifyIOError(e);
    t.deepEqual(testInportConstructionUtil.invalidGoyoAppDataDir.message, e.message);
    t.pass('Success InportConstruction_NotFoundDataDir');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
    TARGET.removeListener('error', testInportConstructionUtil.onError);
  }
});

// get album detail with full settings
// Normal case
test.serial('InportConstruction_notFoundDataFolder', async t => {
  testInportConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testInportConstructionUtil.onAbort)
  TARGET.once('error', testInportConstructionUtil.onError);
  try {
    //Create fixture
    await TARGET.importConstruction();
    // compare
    t.fail('InportConstruction_notFoundDataFolder');
  } catch (e) {
    t.is(e.type, testInportConstructionUtil.notFoundDataFolder.type);
    t.is(e.message, testInportConstructionUtil.notFoundDataFolder.message);
    t.pass('InportConstruction_notFoundDataFolder');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
    TARGET.removeListener('error', testInportConstructionUtil.onError);
  }
});

// get album detail with full settings
// Normal case
test.serial('InportConstruction_dataFolderNotExits', async t => {
  testInportConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testInportConstructionUtil.onAbort)
  TARGET.once('error', testInportConstructionUtil.onError);
  try {
    //Create fixture
    let dataFolder = path.join(GOYO19_APP_FOLDER, "construction1000");
    await TARGET.importConstruction(dataFolder);
    // compare
    t.fail('InportConstruction_dataFolderNotExits');
  } catch (e) {
    t.is(e.type, testInportConstructionUtil.dataFolderNotExits.type);
    t.is(e.message, testInportConstructionUtil.dataFolderNotExits.message);
    t.pass('InportConstruction_dataFolderNotExits');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testInportConstructionUtil.onAbort);
    TARGET.removeListener('error', testInportConstructionUtil.onError);
  }
});


// test utility
var testInportConstructionUtil = {
  t: null,

  initialize: function (t) {
    this.t = t;
  },

  invalidGoyoAppDataDir: {
    type: 'IO_ERROR',
    message: 'Not found GoyoAppDataDirectory undefined'
  },

  constructionExisted: {
    type: 'INVALID_COMMAND',
    message: 'this construction is existed in database'
  },

  notFoundDataFolder: {
    type: 'INVALID_COMMAND',
    message: '\'args.dataFolder\' is not specified'
  },

  dataFolderNotExits: {
    type: 'IO_ERROR',
    message: 'not found source import: ' + path.join(GOYO19_APP_FOLDER, "construction1000")
  },

  errorDatabaseException: {
    type: 'INTERNAL_ERROR',
    message: 'no such table: albumFrame - Delete Album fail'
  },

  errorOther: {
    type: 'OTHER_ERROR',
    message: 'delete album exception filesystem'
  },

  errorBookrackSystem: {
    type: 'INVALID_COMMAND',
    message: 'bookrack system not exits specialType = 1 - Delete Album fail'
  },

  albumDelete: {
    albumId: 4,
    dropPhotosAlbumId: 8,
    systemBookrackItemId: 1
  },

  albumDeleteNoGarbage: {
    albumId: 4,
    dropPhotosAlbumId: 0,
    systemBookrackItemId: 0
  },

  verifyOtherError: function (error) {
    let t = this.t;
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    if (error.type !== 'OTHER_ERROR') {
      t.fail();
    }
  },

  verifyInvalidCommand: function (error) {
    let t = this.t;
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    if (error.type !== 'INVALID_COMMAND') {
      t.fail();
    }
  },

  verifyInternalError: function (error) {
    let t = this.t;
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    if (error.type !== 'INTERNAL_ERROR') {
      t.fail();
    }
  },

  verifyIOError: function (error) {
    let t = this.t;
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    if (error.type !== 'IO_ERROR') {
      t.fail();
    }
  },

  _verifyProperties: function (obj, fields) {
    let t = this.t;
    fields.forEach(function (field) {
      if (!obj.hasOwnProperty(field)) {
        console.log(JSON.stringify(obj, null, 2));
        t.fail('Not found ' + field);
      }
    });
  },

  onError: function (e) {
    console.log('bookrackAccessor error: ', e);
  },

  onAbort: function (e) {
    console.log('bookrackAccessor aborted: ', e);
  },
};

//Fuction create data test
async function copyTestData(source, destination) {
  try {
    //copy test data Goyo19.
    if (fs.existsSync(destination)) {
      fs.removeSync(destination);
    }
    fs.mkdirsSync(destination, 0o777);
    fs.copySync(source, destination);
  } catch (e) {
    console.log('error: ', e);
  }
}

//Fuction create data test
async function updateDatabase() {
  try {
    const masterDb = await sqlite.open(MASTERDB, {
      Promise
    });
    let dataFolder = path.join(GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID);
    await masterDb.run(`UPDATE construction SET dataFolder = ?  WHERE constructionId = ?`, [dataFolder, CONSTRUCTION_ID]);
    await masterDb.close();

  } catch (e) {
    console.log('error: ', e);
  }
}