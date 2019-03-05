'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const sqlite = require('sqlite');
const Promise = require('bluebird')

const BOOKRACK_MODULE = '../../../bookrack-accessor.js';

const GOYO19_APP_FOLDER = 'tests\\test_data\\data_test_copy_construction';
const GOYO19_FIXTURES_FOLDER = 'tests\\test_data\\fixtures';

// accessor test should be done in serial
// normal case
test.serial('getCopyConstruction', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);
    if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction2\\kouji.xml')) {
      t.fail();
    }
    if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction2\\constructionDB.db')) {
      t.fail();
    }
    t.pass('Success copyConstruction');
  } catch(e) {
    console.log(e);
    t.fail('Failed copyConstruction');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

test.serial('external folder no flag', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }
  let externalFolder = path.join(path.resolve(GOYO19_APP_FOLDER,'../'),'tmp');
  fs.mkdirSync(externalFolder);
  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2,externalFolder,false);
    const getResponse = await TARGET.getConstructions(response.constructionId);
    t.is(getResponse.constructions[1].dataFolder,externalFolder);
    t.is(getResponse.constructions[1].isExternalFolder,false);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);
    if (!fs.existsSync(externalFolder + '\\kouji.xml')) {
      try {
        fs.statSync(externalFolder + '\\kouji.xml');
      } catch (error) {
				console.log("​}catch -> error", error)
        
      }
      t.fail();
    }
    if (!fs.existsSync(externalFolder + '\\constructionDB.db')) {
      t.fail();
    }
    t.pass('Success copyConstruction');
  } catch(e) {
    console.log(e);
    t.fail('Failed copyConstruction');
  } finally {
    fse.removeSync(externalFolder);
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

test.serial('external folder set flag', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }
  let externalFolder = path.join(path.resolve(GOYO19_APP_FOLDER,'../'),'tmp');
  fs.mkdirSync(externalFolder);
  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2,externalFolder, true, true);
    const getResponse = await TARGET.getConstructions(response.constructionId);
    t.is(getResponse.constructions[1].dataFolder,externalFolder);
    t.is(getResponse.constructions[1].isExternalFolder,true);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);
    if (!fs.existsSync(externalFolder + '\\kouji.xml')) {
      try {
        fs.statSync(externalFolder + '\\kouji.xml');
      } catch (error) {
				console.log("​}catch -> error", error)
        
      }
      t.fail();
    }
    if (!fs.existsSync(externalFolder + '\\constructionDB.db')) {
      t.fail();
    }
    t.pass('Success copyConstruction');
  } catch(e) {
    console.log(e);
    t.fail('Failed copyConstruction');
  } finally {
    fse.removeSync(externalFolder);
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});
test.serial('external folder not exists', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }
  let externalFolder = path.join(path.resolve(GOYO19_APP_FOLDER,'../'),'tmp');
  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2,externalFolder,true);
    const getResponse = await TARGET.getConstructions(response.constructionId);
    t.is(getResponse.constructions[1].dataFolder,externalFolder);
    t.is(getResponse.constructions[1].isExternalFolder,true);
    t.is(response.hasOwnProperty('constructionId'), true);
    t.is(response.constructionId, 2);
    if (!fs.existsSync(externalFolder + '\\kouji.xml')) {
      try {
        fs.statSync(externalFolder + '\\kouji.xml');
      } catch (error) {
				console.log("​}catch -> error", error)
      }
      t.fail();
    }
    if (!fs.existsSync(externalFolder + '\\constructionDB.db')) {
      t.fail();
    }
    t.pass('Success copyConstruction');
  } catch(e) {
    console.log(e);
    t.fail('Failed copyConstruction');
  } finally {
    fse.removeSync(externalFolder);
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// srcConstructionIdis not specified
test.serial('copyConstructionSrcConstructionIdNotSpecified', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const newFolder = TARGET.getNewConstructionFolder(GOYO19_APP_FOLDER);
    const response = await TARGET.copyConstruction('0', 2, newFolder);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(
        e.message,
        testCopyConstructionUtil.srcConstructionIdNotSpecified.message);
    t.pass('Success copyConstructionSrcConstructionIdNotSpecified');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// newDataFolder = internal folder
test.serial('copyConstructionInvalidNewDataFolder', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2, GOYO19_APP_FOLDER);
    t.fail('Failed copyConstructionInvalidNewDataFolder');
  } catch(e) {
    t.is(e.message, testCopyConstructionUtil.invalidNewDataFolder.message);
    t.pass('Success copyConstructionInvalidNewDataFolder');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// display order is not specified
// This process is unnecessary
test.serial('copyConstructionDisplayNumberNotSpecified', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, '3');
    t.fail('Failed copyConstructionDisplayNumberNotSpecified');
  } catch(e) {
    t.is(e.message, testCopyConstructionUtil.invalidDisplayNumber.message);
    t.pass('Success copyConstructionDisplayNumberNotSpecified');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// Not found srcConstructionDir
test.serial('copyConstructionNotFoundFolderConstruction', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    t.pass();
    const response = await TARGET.copyConstruction(2, 3);
    t.fail('Failed copyConstructionNotFoundFolderConstruction');
  } catch(e) {
    t.is(e.message, testCopyConstructionUtil.invalidFolderNotFound.message);
    t.pass('Success copyConstructionNotFoundFolderConstruction');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// Not found kouji file
test.serial('copyConstructionNotFoundKouji', async t => {
  testCopyConstructionUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testCopyConstructionUtil.createFixture(GOYO19_APP_FOLDER);

  testCopyConstructionUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testCopyConstructionUtil.onAbort)
      .once('error', testCopyConstructionUtil.onError);
  try {
    const response = await TARGET.copyConstruction(1, 2);
    t.fail('Failed copyConstructionNotFoundKouji');
  } catch(e) {
    t.pass('Success copyConstructionNotFoundKouji');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testCopyConstructionUtil.onAbort);
    TARGET.removeListener('error', testCopyConstructionUtil.onError);
  }
});

// test utility
var testCopyConstructionUtil = {
  t: null,

  initialize : function(t) {
    this.t = t;
  },

  srcConstructionIdNotSpecified: {
    type: 'INVALID_COMMAND',
    message: '\'args.srcConstructionId\' is not specified'
  },

  invalidConstructionId: {
    type: 'INVALID_COMMAND',
    message: '\'args.constructionId\' is not specified'
  },

  invalidDisplayNumber: {
    type: 'INVALID_COMMAND',
    message: '\'args.displayNumber\' is not specified'
  },

  invalidNewDataFolder: {
    type: 'INVALID_COMMAND',
    message: '\'args.newDataFolder\' is not valid'
  },

  invalidFolderNotFound: {
    type: 'INVALID_COMMAND',
    message: 'Not found constructionId : 2'
  },

  verifyIOError : function(error) {
    let fields = [
      'type',
      'message',
    ];
    this._verifyProperties(error, fields);
    this.t.is(error.type, 'IO_ERROR');
  },

  _verifyProperties : function(obj, fields) {
    let t = this.t;
    fields.forEach(function (field) {
      if(!obj.hasOwnProperty(field)){
        console.log(JSON.stringify(obj, null, 2));
        t.fail('Not found ' + field);
      }  
    });
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

    const constructionPath = appFolder + '\\construction1';
    if (!fs.existsSync(constructionPath)) {
      fs.mkdirSync(constructionPath, 0o777);
    }
    fs.copyFileSync(__dirname + '../../../../databases/org_db/constructionDB.db', constructionPath + '\\constructionDB.db');

    // insert data into contructionDB.db
    const db1 = await sqlite.open(constructionPath + '\\constructionDB.db', { Promise });
    await db1.run(`DELETE FROM constructionDetail;`);
    await db1.run(
      `INSERT INTO constructionDetail ('internalConstructionId','constructionName', 'startDate', 'endDate', 'constructionYear', 'constructionNumber', 'knackId', 'contracteeCode', 'largeCategory','middleCategory', 'smallCategory', 'contracteeName', 'contractorCode','contractorName') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [1, this.responseData.construction.constructionName,
        this.responseData.construction.startDate,
        this.responseData.construction.endDate,
        this.responseData.construction.year,
        this.responseData.construction.constructionNumber,
        this.responseData.construction.knack.knackId,
        this.responseData.construction.contractee.contracteeCode,
        this.responseData.construction.contractee.largeCategory,
        this.responseData.construction.contractee.middleCategory,
        this.responseData.construction.contractee.smallCategory,
        this.responseData.construction.contractee.contracteeName,
        this.responseData.construction.contractor.contractorCode,
        this.responseData.construction.contractor.contractorName]);
    await db1.close();

    const bookrackPath = constructionPath + '\\bookrack';
    if (!fs.existsSync(bookrackPath)) {
      fs.mkdirSync(bookrackPath, 0o777);
    }

    const albumPath = bookrackPath + '\\album1';
    if (!fs.existsSync(albumPath)) {
      fs.mkdirSync(albumPath, 0o777);
    }

    fs.copyFileSync(__dirname + '../../../../databases/org_db/masterDB.db', GOYO19_APP_FOLDER + '\\masterDB.db');
    const db2 = await sqlite.open(GOYO19_APP_FOLDER + '\\masterDB.db', { Promise });
    await db2.run(`DELETE FROM construction;`);
    await db2.run(
      `INSERT INTO construction('constructionId', 'oldConstructionId', 'dataFolder', 'displayNumber', 'isExternalFolder', 'isSharedFolder', 'cloudStrage') VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [this.responseData.construction.constructionId,
      'data',
      this.responseData.construction.dataFolder,
      this.responseData.construction.displayNumber,
      this.responseData.construction.isExternalFolder,
      this.responseData.construction.isSharedFolder,
      0] );
    await db2.close();
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testCopyConstructionUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  responseData : {
    'construction': {
      'constructionId': 1,
      'constructionName': '業務名称＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省',
      'constructionNumber': '1',
      'contractee': {
        'contracteeCode': '1',
        'contracteeName': '発注者機関事務所名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省',
        'largeCategory': '',
        'middleCategory': '',
        'smallCategory': ''
      },
      'contractor': {
        'contractorCode': '1',
        'contractorName': '受注者名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省'
      },
      'createDate': '2018/04/27',
      'dataFolder': GOYO19_APP_FOLDER + '\\construction1',
      'dataFolderSize': '75828',
      'displayNumber': 6,
      'endDate': '2018/04/28',
      'isExternalFolder': false,
      'isSharedFolder' : false,
      'knack': {
        'knackId': 511,
        'knackName': '国交省 設計 H28.3',
        'knackType': 1
      },
      'startDate': '2018/04/27',
      'year': 2018
    }
  }
};




