'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird')

const BOOKRACK_MODULE = '../../../bookrack-accessor.js';

const GOYO19_APP_FOLDER = 'tests\\test_data\\data_test_get_constructions';

// accessor test should be done in serial
// normal case
test.serial('getConstructions', async t => {
  testGetConstructionsUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsUtil.createFixture(GOYO19_APP_FOLDER);
  testGetConstructionsUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetConstructionsUtil.onAbort)
      .once('error', testGetConstructionsUtil.onError);
  try {
    const response = await TARGET.getConstructions();
    t.deepEqual(response, testGetConstructionsUtil.responseData);
    t.pass('Success getConstructions');
  } catch(e) {
    console.log(e);
    t.fail('Failed getConstructions');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsUtil.onError);
  }
});

// case not found data folder
test.serial('getConstructionsNotFoundDataFolder', async t => {
  testGetConstructionsUtil.deleteOldData(GOYO19_APP_FOLDER);
  await testGetConstructionsUtil.createFixture(GOYO19_APP_FOLDER);
  testGetConstructionsUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER + '_NotFound');
  TARGET.once('abort', testGetConstructionsUtil.onAbort)
      .once('error', testGetConstructionsUtil.onError);
  try {
    const response = await TARGET.getConstructions();
    t.fail();
  } catch(e) {
    t.is(e.type, testGetConstructionsUtil.notFoundDataFolder.type);
    t.is(e.message, testGetConstructionsUtil.notFoundDataFolder.message);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbort);
    TARGET.removeListener('error', testGetConstructionsUtil.onError);
  }
});

// test utility
var testGetConstructionsUtil = {
  t: null,

  initialize : function(t) {
    this.t = t;
  },
  
  notFoundDataFolder: {
    type: 'IO_ERROR',
    message: 'Not found ' + GOYO19_APP_FOLDER + '_NotFound'
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
      fs.copyFileSync(__dirname + '../../../../databases/org_db/constructionDB.db', constructionPath + '\\constructionDB.db');

      // insert data into contructionDB.db
      const db = await sqlite.open(constructionPath + '\\constructionDB.db', { Promise });
      await db.run(`DELETE FROM constructionDetail;`);
      await db.run(
        `INSERT INTO constructionDetail ('internalConstructionId','constructionName', 'startDate', 'endDate', 'constructionYear', 'constructionNumber', 'knackId', 'contracteeCode', 'largeCategory','middleCategory', 'smallCategory', 'contracteeName', 'contractorCode','contractorName') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
      [i, this.responseData.constructions[i-1].constructionName,
          this.responseData.constructions[i-1].startDate,
          this.responseData.constructions[i-1].endDate,
          this.responseData.constructions[i-1].year,
          this.responseData.constructions[i-1].constructionNumber,
          this.responseData.constructions[i-1].knack.knackId,
          this.responseData.constructions[i-1].contractee.contracteeCode,
          this.responseData.constructions[i-1].contractee.largeCategory,
          this.responseData.constructions[i-1].contractee.middleCategory,
          this.responseData.constructions[i-1].contractee.smallCategory,
          this.responseData.constructions[i-1].contractee.contracteeName,
          this.responseData.constructions[i-1].contractor.contractorCode,
          this.responseData.constructions[i-1].contractor.contractorName]);
      await db.close();

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
    fs.copyFileSync(__dirname + '../../../../databases/org_db/masterDB.db', GOYO19_APP_FOLDER + '\\masterDB.db');
    const db = await sqlite.open(GOYO19_APP_FOLDER + '\\masterDB.db', { Promise });
    await db.run(`DELETE FROM construction;`);
    await db.run(`DELETE FROM knack;`);
    for (let i = 1; i <= 3; i++) {
      await db.run(
        `INSERT INTO construction('constructionId', 'oldConstructionId', 'dataFolder', 'displayNumber', 'isExternalFolder', 'isSharedFolder', 'cloudStrage') VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [i, 'data' + i, GOYO19_APP_FOLDER + '\\construction' + i, i, 0, 0, 0] );

      await db.run(
        `INSERT INTO knack('knackId', 'knackName', 'knackType') VALUES (?, ?, ?);`,
        [this.responseData.constructions[i-1].knack.knackId,
        this.responseData.constructions[i-1].knack.knackName,
        this.responseData.constructions[i-1].knack.knackType]);
    }
    await db.close();
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testGetConstructionsUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  responseData : {
    'constructions': [
      {
        'constructionId': 1,
        'constructionName': '御用達サンプル工事',
        'constructionNumber': 'H24-12345',
        'contractee': {
          'contracteeId' : 0,
          'contracteeCode': '00303003',
          'contracteeName': '発注者A',
          'largeCategory': '国の機関',
          'middleCategory': '内閣府',
          'smallCategory': '大臣官房'
        },
        'contractor': {
          'contractorId' : 0,
          'contractorCode': '00244444444',
          'contractorName': '請負者a'
        },
        'dataFolder': GOYO19_APP_FOLDER + '\\construction1',
        'driveType' : 'fixed',
        'displayNumber': 1,
        'endDate': '2013/10/21',
        'isExternalFolder': false,
        'isSharedFolder': false,
        'cloudStorage': 0,
        'knack': {
          'knackId': 9,
          'knackName': '一般土木',
          'knackType': 8
        },
        'isSample' : false,
        'startDate': '2013/04/01',
        'year': 2013
      },
      {
        'constructionId': 2,
        'constructionName': '国交省工事001',
        'constructionNumber': '1',
        'contractee': {
          'contracteeId' : 0,
          'contracteeCode': '00101001',
          'contracteeName': '',
          'largeCategory': '国の機関',
          'middleCategory': '内閣府',
          'smallCategory': '大臣官房'
        },
        'contractor': {
          'contractorId' : 0,
          'contractorCode': '00244444444',
          'contractorName': '受注者z'
        },
        'dataFolder': GOYO19_APP_FOLDER + '\\construction2',
        'driveType' : 'fixed',
        'displayNumber': 2,
        'endDate': '2018/02/20',
        'isExternalFolder': false,
        'isSharedFolder': false,
        'cloudStorage': 0,
        'knack': {
          'knackId': 561,
          'knackName': '国交省 工事 H28.3',
          'knackType': 2
        },
        'isSample' : false,
        'startDate': '2018/02/20',
        'year': 2017
      },
      {
        'constructionId': 3,
        'constructionName': 'XX市浄水場管理センター建築機械設備工事',
        'constructionNumber': '',
        'contractee': {
          'contracteeId' : 0,
          'contracteeCode': '3244438',
          'contracteeName': 'YYYYYY水道事業団',
          'largeCategory': '国の機関',
          'middleCategory': '内閣府',
          'smallCategory': '大臣官房'
        },
        'contractor': {
          'contractorId' : 0,
          'contractorCode': '1323513',
          'contractorName': '株式会社DDDDDDDDDDDDD'
        },
        'dataFolder': GOYO19_APP_FOLDER + '\\construction3',
        'driveType' : 'fixed',
        'displayNumber': 3,
        'endDate': '2016/12/23',
        'isExternalFolder': false,
        'isSharedFolder': false,
        'cloudStorage': 0,
        'knack': {
          'knackId': 76,
          'knackName': '一般建築',
          'knackType': 9
        },
        'isSample' : false,
        'startDate': '2016/12/23',
        'year': 2016
      },
    ]
  }
};
