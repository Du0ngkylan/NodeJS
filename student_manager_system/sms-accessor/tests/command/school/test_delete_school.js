'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite');

const BOOKRACK_MODULE = '../../../bookrack-accessor.js';

const GOYO19_APP_FOLDER = 'tests\\test_data\\data_test_delete_construction';

test.beforeEach(async t => {
  // This runs before each test
  await testDeleteConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testDeleteConstructionUtil.createFixture(GOYO19_APP_FOLDER);
});

test.afterEach.always('guaranteed cleanup', async t => {
  await testDeleteConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
});

// accessor test should be done in serial
// case japanese folder
test.serial('deleteConstructionJapaneseFolder', async t => {
  const GOYO19_APP_JAPANESE_FOLDER = 'tests\\テストデータ\\data_test_delete_construction';
  testDeleteConstructionUtil.deleteOldData(GOYO19_APP_JAPANESE_FOLDER);
  await testDeleteConstructionUtil.createFixture(GOYO19_APP_JAPANESE_FOLDER);
  testDeleteConstructionUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_JAPANESE_FOLDER);
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    const response = await TARGET.deleteConstruction(2);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);

    if (fs.existsSync(GOYO19_APP_JAPANESE_FOLDER + '\\construction2')) {
      t.fail('Fail to delete folder');
    }
    const db = await sqlite.open(GOYO19_APP_JAPANESE_FOLDER + '\\masterDB.db', { Promise });
    let constructionData = await db.get(`SELECT * FROM construction WHERE constructionId = ?;`, 2);
    await db.close();
    if (constructionData != undefined) {
      t.fail('Fail to delete from db');
    }
    t.pass();
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
    const GOYO19_APP_JAPANESE_FOLDER = 'tests\\テストデータ\\data_test_delete_construction';
    testDeleteConstructionUtil.deleteOldData(GOYO19_APP_JAPANESE_FOLDER);
  }
});

// normal case
test.serial('deleteConstruction', async t => {

  testDeleteConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    const response = await TARGET.deleteConstruction(2);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);

    if (fs.existsSync(GOYO19_APP_FOLDER + '\\construction2')) {
      t.fail('Fail to delete folder');
    }
    const db = await sqlite.open(GOYO19_APP_FOLDER + '\\masterDB.db', { Promise });
    let constructionData = await db.get(`SELECT * FROM construction WHERE constructionId = ?;`, 2);
    await db.close();
    if (constructionData != undefined) {
      t.fail('Fail to delete from db');
    }
    t.pass();
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
  }
});

// not delete directory
test.serial('deleteConstructionNotDeleteDirectory', async t => {
  testDeleteConstructionUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    const response = await TARGET.deleteConstruction(2, false);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);

    if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction2')) {
      t.fail('Deleted folder');
    }
    const db = await sqlite.open(GOYO19_APP_FOLDER + '\\masterDB.db', { Promise });
    let constructionData = await db.get(`SELECT * FROM construction WHERE constructionId = ?;`, 2);
    await db.close();
    if (constructionData != undefined) {
      t.fail('Fail to delete from db');
    }
    t.pass();
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
  }
});

// case not found data folder
test.serial('deleteConstructionNotFoundDataFolder', async t => {
  testDeleteConstructionUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER + '_NotFound');
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    await TARGET.deleteConstruction(2);
    t.fail();
  } catch (e) {
    t.is(e.type, testDeleteConstructionUtil.notFoundDataFolder.type);
    t.is(e.message, testDeleteConstructionUtil.notFoundDataFolder.message);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
  }
});

// case invalid constructionId
test.serial('deleteConstructionInvalidConstructionId', async t => {
  testDeleteConstructionUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    await TARGET.deleteConstruction('');
    t.fail();
  } catch (e) {
    t.is(e.type, testDeleteConstructionUtil.invalidConstructionId.type);
    t.is(e.message, testDeleteConstructionUtil.invalidConstructionId.message);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
  }
});

// Error delete construction
test.serial('deleteErrorConstruction', async t => {
  testDeleteConstructionUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testDeleteConstructionUtil.onAbort)
      .once('error', testDeleteConstructionUtil.onError);
  try {
    await TARGET.deleteConstruction(999999);
    t.fail();
  } catch (e) {
    t.is(e.type, testDeleteConstructionUtil.errorDeleteConstruction.type);
    t.is(e.message, testDeleteConstructionUtil.errorDeleteConstruction.message);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testDeleteConstructionUtil.onAbort);
    TARGET.removeListener('error', testDeleteConstructionUtil.onError);
  }
});

// test utility
var testDeleteConstructionUtil = {
  t: null,

  initialize: function(t) {
    this.t = t;
  },

  notFoundDataFolder: {
    type: 'IO_ERROR',
    message: 'not found GoyoAppDataDirectory ' + GOYO19_APP_FOLDER + '_NotFound'
  },

  invalidConstructionId: {
    type: 'INVALID_COMMAND',
    message: '\'args.constructionId\' is not specified'
  },
  
  errorDeleteConstruction: {
    type: 'IO_ERROR',
    message: 'not found construction'
  },

  onError: function(e) {
    console.log('bookrackAccessor error: ', e);
  },

  onAbort: function(e) {
    console.log('bookrackAccessor aborted: ', e);
  },

  createFixture: async function(appFolder) {
    if (!fs.existsSync(appFolder)) {
      fs.mkdirSync(appFolder, 0o777);
    }
    for (let i = 1; i <= 3; i++) {
      const constructionPath = appFolder + '\\construction' + i;
      if (!fs.existsSync(constructionPath)) {
        fs.mkdirSync(constructionPath, 0o777);
      }
      const bookrackPath = constructionPath + '\\bookrack';
      if (!fs.existsSync(bookrackPath)) {
        fs.mkdirSync(bookrackPath, 0o777);
      }
      for (let j = 1; j <= 3; j++) {
        const albumPath = bookrackPath + '\\album' + j;
        if (!fs.existsSync(albumPath)) {
          fs.mkdirSync(albumPath, 0o777);
        }
      }
    }
    fs.copyFileSync(__dirname + '../../../../databases/org_db/masterDB.db', appFolder + '\\masterDB.db');
    const db = await sqlite.open(appFolder + '\\masterDB.db', { Promise });
    await db.run(`DELETE FROM construction;`);
    for (let i = 1; i <= 3; i++) {
      await db.run(
        `INSERT INTO construction('constructionId', 'oldConstructionId', 'dataFolder', 'displayNumber', 'isExternalFolder', 'isSharedFolder', 'cloudStrage') VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [i, 'construction' + i, appFolder + '\\construction' + i, i, 0, 0, 0] );
    }
    await db.close();
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testDeleteConstructionUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },
};
