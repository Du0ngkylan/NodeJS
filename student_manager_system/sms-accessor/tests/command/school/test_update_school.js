'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs-extra');
const sqlite = require('sqlite');

const CONSTRUCTION_ID = 1;

const BOOKRACK_MODULE = '../../../bookrack-accessor.js';
const GOYO19_APP_FOLDER = path.join(__dirname, '../../..','tests/test_data/data_test_update_construction');
const MASTERDB = path.join(GOYO19_APP_FOLDER, 'masterDB.db');

test.beforeEach(async t => {
  // This runs before each test
  let sourceTestData = path.join(__dirname, '../../..', 'tests/test_data/Goyo19');
  await copyTestData(sourceTestData, GOYO19_APP_FOLDER);
  await updateDatabase();
});

test.afterEach.always('guaranteed cleanup',async t => {
  fs.removeSync(GOYO19_APP_FOLDER);
});

//Test Case Japan path
//normal case 
test.serial('updateConstructionJapaneseFolder', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = CONSTRUCTION_ID;
    let dataFolderOld = path.join(GOYO19_APP_FOLDER, "construction1");
    let dataFolderUpdate = path.join(GOYO19_APP_FOLDER, "データ/construction11");
    inputJson.dataFolder = dataFolderUpdate;
    const result = await TARGET.updateConstruction(inputJson);
    t.deepEqual(result, testUpdateConstructionUtil.updateConstructionSuccess);
    t.deepEqual(fs.existsSync(dataFolderUpdate), true);
    t.deepEqual(fs.existsSync(dataFolderOld), false);
    t.pass();
  } catch (e) {
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

//Test Case
//accessor test should be done in serial
//normal case
test.serial('updateConstruction', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = CONSTRUCTION_ID;
    let dataFolderOld = path.join(GOYO19_APP_FOLDER, "construction1");
    let dataFolderUpdate = path.join(GOYO19_APP_FOLDER, "construction11");
    inputJson.dataFolder = dataFolderUpdate;
    const result = await TARGET.updateConstruction(inputJson);
    t.deepEqual(result, testUpdateConstructionUtil.updateConstructionSuccess);
    t.deepEqual(fs.existsSync(dataFolderUpdate), true);
    t.deepEqual(fs.existsSync(dataFolderOld), false);
    t.pass();
  } catch (e) {
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

//Test Case
//accessor test should be done in serial
//normal case(knackId=76)
test.serial('updateConstructionKnack76', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction_76.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = CONSTRUCTION_ID;
    let dataFolderOld = path.join(GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID);
    let dataFolderUpdate = path.join(GOYO19_APP_FOLDER, "construction12");
    inputJson.dataFolder = dataFolderUpdate;
    const result = await TARGET.updateConstruction(inputJson);
    t.deepEqual(result, testUpdateConstructionUtil.updateConstructionSuccess);
    t.deepEqual(fs.existsSync(dataFolderUpdate), true);
    t.deepEqual(fs.existsSync(dataFolderOld), false);
    t.pass();
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// accessor test should be done in serial
// normal case
test.serial('updateWithCreateConstruction', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = 0;
    let dataFolderCreateConstruction = path.join( GOYO19_APP_FOLDER, "construction3");
    inputJson.dataFolder = dataFolderCreateConstruction;
    const result = await TARGET.updateConstruction(inputJson);
    t.deepEqual(result, testUpdateConstructionUtil.updateWithCreateConstructionSuccess);
    t.deepEqual(fs.existsSync(dataFolderCreateConstruction), true);
    let koujiXmlPath = path.join(dataFolderCreateConstruction, "kouji.XML");
    t.deepEqual(fs.existsSync(koujiXmlPath), true);
    t.pass('updateWithCreateConstruction');
  } catch (e) {
    console.log(e);
    t.fail('updateWithCreateConstruction');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// accessor test should be done in serial
// normal case
test.serial('updateConstructionFail', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = CONSTRUCTION_ID;
    inputJson.dataFolder = "";
    await TARGET.updateConstruction(inputJson);
    t.fail();
  } catch (e) {
    testUpdateConstructionUtil.verifyInternalError(e);
    t.pass('Success updateConstructionFail');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// accessor test should be done in serial
// normal case
test.serial('updateConstructionNotFounldConstructionId', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    delete inputJson.constructionId;
    await TARGET.updateConstruction(inputJson);
    t.fail();
  } catch (e) {
    t.is(e.type, testUpdateConstructionUtil.invalidConstructionId.type);
    t.is(e.message, testUpdateConstructionUtil.invalidConstructionId.message);
    t.pass('Success updateConstructionNotFounldConstructionId');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// Abnormal case - check validation for constructionId.
test.serial('checkInvalidConstructionId', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {    
    await TARGET.updateConstruction({});
    t.fail('Fail checkInvalidConstructionId');
  } catch (e) {
    t.is(e.type, testUpdateConstructionUtil.invalidConstructionId.type);
    t.is(e.message, testUpdateConstructionUtil.invalidConstructionId.message);
    t.pass('Success checkInvalidConstructionId');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// abnormal case - check knackinfo in json file.
test.serial('checkKnackId', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.constructionId = CONSTRUCTION_ID;
    let dataFolderUpdate = path.join(GOYO19_APP_FOLDER, "construction11");
    inputJson.dataFolder = dataFolderUpdate;
    inputJson["knack"].knackId = 0;
    await TARGET.updateConstruction(inputJson);
    t.fail();
  } catch (e) {
    t.is(e.type, testUpdateConstructionUtil.invalidKnackId.type);
    t.is(e.message, testUpdateConstructionUtil.invalidKnackId.message);
    t.pass('Success checkKnackId');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// Abnormal case - check updateFolder path for Construction info.
test.serial('checkUpdateFolderPath', async t => {
  testUpdateConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testUpdateConstructionUtil.onAbort)
  TARGET.once('error', testUpdateConstructionUtil.onError);
  try {
    let inputJsonPath = path.join(GOYO19_APP_FOLDER, "json_input/input_test_update_construction.json");
    let content = fs.readFileSync(inputJsonPath, 'utf8');
    let inputJson = JSON.parse(content);
    inputJson.dataFolder = "";
    await TARGET.updateConstruction(inputJson);
    t.fail();    
  } catch (e) {
    t.is(e.message, testUpdateConstructionUtil.existUpdateFolder.message);
    t.is(e.type, testUpdateConstructionUtil.existUpdateFolder.type);
    t.pass('Success checkUpdateFolderPath');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testUpdateConstructionUtil.onAbort);
    TARGET.removeListener('error', testUpdateConstructionUtil.onError);
  }
});

// test utility
var testUpdateConstructionUtil = {
  t: null,

  initialize: function (t) {
    this.t = t;
  },

  updateConstructionSuccess: {
    constructionId: 1
  },

  updateWithCreateConstructionSuccess: {
    constructionId: 3
  },

  invalidConstructionId: {
    type: 'INVALID_COMMAND',
    message: "'args constructionId' is not specified"
  },

  invalidConstruction: {
    type: 'INVALID_COMMAND',
    message: '\'args.construction\' is not specified'
  },

  invalidKnackId: {
    type: 'INVALID_COMMAND',
    message: 'KnackInfo is not specified'
  },

  existUpdateFolder: {
    type: 'INTERNAL_ERROR',
    message: 'UpdateConstructionInfo fail'
  },

  existDataFolder: {
    type: 'IO_ERROR', 
    message: 'DataFolder of construction not exits'
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
      error.message.toLowerCase().indexOf("'args constructionId' is not specified") == -1) {
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

//Fuction delete data test
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

//Fuction create data test
async function copyTestData(source, destination) {
  try {
    //copy test data Goyo19.
    if (fs.existsSync(destination)) {
      fs.removeSync(destination);
    }
    fs.mkdirSync(destination, 0o777);
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

    await deleteFolderRecursive(path.join(GOYO19_APP_FOLDER, "construction" + CONSTRUCTION_ID, "/bookrack/album2"));
  } catch (e) {
    console.log('error: ', e);
  }
}