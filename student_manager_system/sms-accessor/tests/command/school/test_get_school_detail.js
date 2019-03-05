'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird')

const BOOKRACK_MODULE = '../../../bookrack-accessor.js';

const GOYO19_APP_FOLDER = 'tests\\test_data\\data_test_getconstruction_detail';
const GOYO19_FIXTURES_FOLDER = 'tests\\test_data\\fixtures';

// accessor test should be done in serial
// case japanese folder
test.serial('getConstructionDetailJapaneseFolder', async t => {
  const GOYO19_APP_JAPANESE_FOLDER = 'tests\\テストデータ\\data_test_getconstruction_detail';
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_JAPANESE_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_JAPANESE_FOLDER);

  if (!fs.existsSync(GOYO19_APP_JAPANESE_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_JAPANESE_FOLDER + '\\construction1\\kouji.xml');
  }

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_JAPANESE_FOLDER);
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail(1, true);
    let responsedata = JSON.parse(JSON.stringify(testGetConstructionsDetailUtil.responseData));
    responsedata.construction.dataFolder = GOYO19_APP_JAPANESE_FOLDER + '\\construction1';
    t.deepEqual(response, responsedata);
    t.pass('Success getConstructionDetailJapaneseFolder');
  } catch(e) {
    console.log(e);
    t.fail('Failed getConstructionDetailJapaneseFolder');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// normal case
test.serial('getConstructionDetail', async t => {
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail(1, true);
    t.deepEqual(response, testGetConstructionsDetailUtil.responseData);
    t.pass('Success getConstructionDetail');
  } catch(e) {
    console.log(e);
    t.fail('Failed getConstructionDetail');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// constructionId is not specified
test.serial('getConstructionDetailConstructionIdNotSpecified', async t => {
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail();
    t.fail('Failed getConstructionDetailConstructionIdNotSpecified');
  } catch(e) {
    t.is(e.message, testGetConstructionsDetailUtil.invalidConstructionId.message);
    t.pass('Success getConstructionDetailConstructionIdNotSpecified');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// folder construction is not found
test.serial('getConstructionDetailConstructionFolderNotFound', async t => {
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_FOLDER);

  if (!fs.existsSync(GOYO19_APP_FOLDER + '\\construction1\\kouji.xml')) {
    fs.copyFileSync(
        GOYO19_FIXTURES_FOLDER + '\\kouji.fixture1',
        GOYO19_APP_FOLDER + '\\construction1\\kouji.xml');
  }

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail(2);
    console.log(response);  
    t.fail('Failed getConstructionDetailConstructionFolderNotFound');
  } catch(e) {
    t.is(e.message, testGetConstructionsDetailUtil.invalidFolderNotFound.message);
    t.pass('Success getConstructionDetailConstructionFolderNotFound');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// Not found kouji file
test.serial('getConstructionDetailNotFoundKouji', async t => {
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_FOLDER);

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail(1);    
    t.fail('Failed getConstructionDetailNotFoundKouji');
  } catch(e) {
    t.pass('Success getConstructionDetailNotFoundKouji');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// case not found data folder
test.serial('getConstructionDetailNotFoundDataFolder', async t => {
  testGetConstructionsDetailUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsDetailUtil.createFixture(GOYO19_APP_FOLDER);

  testGetConstructionsDetailUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER + '_NotFound');
  TARGET.once('abort', testGetConstructionsDetailUtil.onAbort)
      .once('error', testGetConstructionsDetailUtil.onError);
  try {
    const response = await TARGET.getConstructionDetail(1);
    t.fail();
  } catch(e) {
    t.is(e.message, testGetConstructionsDetailUtil.notFoundDataFolder.message);
    t.is(e.type, testGetConstructionsDetailUtil.notFoundDataFolder.type);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsDetailUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsDetailUtil.onError);
  }
});

// test utility
var testGetConstructionsDetailUtil = {
  t: null,

  initialize : function(t) {
    this.t = t;
  },

  invalidConstructionId: {
    type: 'INVALID_COMMAND',
    message: '\'args.constructionId\' is not specified'
  },

  invalidFolderNotFound: {
    type: 'INVALID_COMMAND',
    message: 'Not found construction - 2'
  },

  notFoundDataFolder: {
    type: 'IO_ERROR',
    message: 'Not found ' + GOYO19_APP_FOLDER + '_NotFound'
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

    fs.copyFileSync(__dirname + '../../../../databases/org_db/masterDB.db', appFolder + '\\masterDB.db');
    const db2 = await sqlite.open(appFolder + '\\masterDB.db', { Promise });
    await db2.run(`DELETE FROM construction;`);
    await db2.run(`DELETE FROM knack;`);
    await db2.run(
      `INSERT INTO construction('constructionId', 'oldConstructionId', 'dataFolder', 'displayNumber', 'isExternalFolder', 'isSharedFolder', 'cloudStrage') VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [this.responseData.construction.constructionId,
      'data',
      appFolder + '\\construction1',
      this.responseData.construction.displayNumber,
      this.responseData.construction.isExternalFolder,
      this.responseData.construction.isSharedFolder,
      1] );

    await db2.run(
      `INSERT INTO knack('knackId', 'knackName', 'knackType') VALUES (?, ?, ?);`,
      [this.responseData.construction.knack.knackId,
      this.responseData.construction.knack.knackName,
      this.responseData.construction.knack.knackType]);

    await db2.close();
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testGetConstructionsDetailUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  responseData : {
    'construction': {
      'addresses': [{
        'address': '沖縄県那覇市',
        'addressCode': '47201'
      }, {
        'address': '北海道札幌市中央区',
        'addressCode': '01101'
      }],
      'businessCodes': ['0111000', '0211000'],
      'businessKeywords': ['1m深地温探査', '50年確率波'],
      'constructionContents': '業務概要＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省',
      'constructionId': 1,
      'constructionMethodForms': [],
      'constructionName': '業務名称＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省',
      'constructionNumber': '1',
      'constructionSystemNumber': '1',
      'constructionSystemVersionNumber': '1',
      'contractee': {
        'contracteeId' : 0,
        'contracteeCode': '1',
        'contracteeName': '発注者機関事務所名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省',
        'largeCategory': '',
        'middleCategory': '',
        'smallCategory': ''
      },
      'contractor': {
        'contractorId' : 0,
        'contractorCode': '1',
        'contractorName': '受注者名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省'
      },
      'createDate': '2018/04/27',
      'dataFolder': GOYO19_APP_FOLDER + '\\construction1',
      'driveType' : 'fixed',
      'dataFolderSize': '151604',
      'displayNumber': 6,
      'eastLongitude': '1',
      'endDate': '2018/04/28',
      'facilityNames': ['施設名称＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省'],
      'geodetic': '02',
      'guId': '5A485AB448E74662A43D720CEFFD1AEB',
      'isExternalFolder': false,
      'isSharedFolder' : false,
      'cloudStorage': 1,
      'knack': {
        'knackId': 511,
        'knackName': '国交省 設計 H28.3',
        'knackType': 1
      },
      'isSample' : false,
      'mainBusinessContents': '1',
      'northLatitude': '2',
      'sourthLatitude': '3',
      'startDate': '2018/04/27',
      'waterRouteInformations': [{
        'distanceMeters': [{
          'distanceMeterSection': '測点',
          'pStationEndM': '4',
          'pStationEndN': '3',
          'pStationStartM': '2',
          'pStationStartN': '1'
        }],
        'lineCodes': ['00', '01'],
        'riverCodes': ['1', '2'],
        'routeSection': '0',
        'waterRouteCode': '12000',
        'waterRouteName': '対象水系路線名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省'
      },
      {
        'distanceMeters': [{
          'distanceMeterSection': '測点',
          'pStationEndM': '3',
          'pStationEndN': '2',
          'pStationStartM': '1',
          'pStationStartN': '0'
        }, {
          'distanceMeterSection': '距離標',
          'pDistanceEndM': '3',
          'pDistanceEndN': '2',
          'pDistanceStartM': '1',
          'pDistanceStartN': '0'
        }],
        'lineCodes': ['00', '01'],
        'riverCodes': ['0123', '01234'],
        'routeSection': '0',
        'waterRouteCode': '11000',
        'waterRouteName': '対象水系路線名＿平成28年3月の要領に準拠｜土木設計業務等の電子納品要領｜国土交通省'
      }],
      'westLongitude': '0',
      'year': 2018
    }
  }
};
