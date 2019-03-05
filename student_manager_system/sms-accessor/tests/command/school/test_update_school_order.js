'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs-extra');
const sqlite = require('sqlite');

const ROOT_DRI = path.join(__dirname, '../../..')
const BOOKRACK_MODULE = '../../../bookrack-accessor.js';
const GOYO19_APP_FOLDER = 'tests/test_data/data_test_update_construction_order';
const SOURCE_TEST_DATA = path.join(ROOT_DRI, 'tests/test_data/goyo19');

const CONSTRUCTION_ID = [1, 2];
const MASTERDB_FILE = 'masterDB.db';

//Fuction create data test
async function copyTestData(source, destination) {
  const masterDbFile = path.join(destination, MASTERDB_FILE);
  try {
    //copy test data Goyo19.
    if (fs.existsSync(destination)) {
      fs.removeSync(destination);
    }
    fs.mkdirSync(destination, 0o777);
    fs.copySync(source, destination);
    let dataFolderUpdate1 = path.join(__dirname, "../../..", GOYO19_APP_FOLDER, "construction1");
    let dataFolderUpdate2 = path.join(__dirname, "../../..", GOYO19_APP_FOLDER, "construction2");
    const db = await sqlite.open(masterDbFile, {
      Promise
    });
    await db.run(`UPDATE construction SET dataFolder = ?  WHERE constructionId = ?`, [dataFolderUpdate1, CONSTRUCTION_ID[0]]);
    await db.run(`UPDATE construction SET dataFolder = ?  WHERE constructionId = ?`, [dataFolderUpdate2, CONSTRUCTION_ID[1]]);
    await db.close();
  } catch (e) {
    console.log('error: ', e);
  }
}


//Test Case
// accessor test should be done in serial
// normal case
test.serial('updateConstructionOrder', async t => {
  let destPath = path.join(ROOT_DRI, GOYO19_APP_FOLDER);
  await copyTestData(SOURCE_TEST_DATA, destPath)
  testUpdateConstructionOrderUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionOrderUtil.onAbort)
  TARGET.once('error', testUpdateConstructionOrderUtil.onError);
  try {
    let constructions = [{
        "constructionId": 1,
        "displayNumber": 2,
      },
      {
        "constructionId": 2,
        "displayNumber": 1,
      },
    ];
    const result = await TARGET.updateConstructionOrder(constructions);
    t.deepEqual(result, testUpdateConstructionOrderUtil.updateConstructionSuccess);
    t.pass();
  } catch (e) {
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionOrderUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionOrderUtil.onError);
  }
});

// accessor test should be done in serial
// normal case
// test.serial('updateConstructionNotChangeDataFolder', async t => {
//   let destPath = path.join(ROOT_DRI, GOYO19_APP_FOLDER);
//   await copyTestData(SOURCE_TEST_DATA, destPath)
//   testUpdateConstructionOrderUtil.initialize(t);
//   const TARGET = require(BOOKRACK_MODULE);
//   TARGET.initialize(GOYO19_APP_FOLDER);
//   TARGET.once('abort', testUpdateConstructionOrderUtil.onAbort)
//   TARGET.once('error', testUpdateConstructionOrderUtil.onError);
//   try {
//     let inputJsonPath = path.join(__dirname, "../../..", GOYO19_APP_FOLDER, "json_input/input_test_update_construction_order.json");
//     let content = fs.readFileSync(inputJsonPath, 'utf8');
//     let inputJson = JSON.parse(content);
//     let dataFolderOlds = [];
//     let size = inputJson.constructions.length;
//     for (let i = 0; i < size; i++) {
//       inputJson.constructions[i].constructionId = CONSTRUCTION_ID[i];
//       dataFolderOlds.push(path.join(ROOT_DRI, GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID[i]));
//       inputJson.constructions[i].dataFolder = dataFolderOlds[i];
//     }
//     const result = await TARGET.updateConstructionOrder(inputJson.constructions);
//     t.deepEqual(result, testUpdateConstructionOrderUtil.updateConstructionSuccess);
//     for (let i = 0; i < size; i++) {
//       t.deepEqual(fs.existsSync(dataFolderOlds[i]), true);
//     }
//     t.pass();
//   } catch (e) {
//     console.log(e);
//     t.fail();
//   } finally {
//     await TARGET.finalize();
//     TARGET.removeListener('abort', testUpdateConstructionOrderUtil.onAbort);
//     TARGET.removeListener('error', testUpdateConstructionOrderUtil.onError);
//   }
// });

// accessor test should be done in serial
// normal case
test.serial('updateConstructionFail', async t => {
  let destPath = path.join(ROOT_DRI, GOYO19_APP_FOLDER);
  await copyTestData(SOURCE_TEST_DATA, destPath)
  testUpdateConstructionOrderUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionOrderUtil.onAbort)
  TARGET.once('error', testUpdateConstructionOrderUtil.onError);
  try {
    let constructions = [{
        "constructionId": 1,
        "displayNumber": 1,
      },
      {
        "constructionId": 2,
        "displayNumber": 2,
      },
    ];
    const result = await TARGET.updateConstructionOrder(constructions);
    t.deepEqual(result, testUpdateConstructionOrderUtil.updateConstructionFail);
    t.pass();
  } catch (e) {
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionOrderUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionOrderUtil.onError);
  }
});

// test utility
var testUpdateConstructionOrderUtil = {
  t: null,

  initialize: function (t) {
    this.t = t;
  },

  updateConstructionSuccess: {
    updateCount: 2
  },

  updateConstructionFail: {
    updateCount: 0
  },

  verifyInternalError: function (error) {
    let t = this.t;
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    if (error.type !== 'INTERNAL_ERROR' &&
      error.message.toLowerCase().indexOf('updateconstructioninfo fail') == -1) {
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
    if (error.type !== 'IO_ERROR' &&
      error.message.toLowerCase().indexOf("constructionsId' is not invalid") == -1) {
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