'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird')

const MODULE_TEST = '../../../index.js';

const FOLDER_TEST = 'tests\\test_data';

// test should be done in serial
// normal case
test.serial('getUsers', async t => {
  testGetUsersUtil.deleteOldData(FOLDER_TEST);
  await testGetUsersUtil.createFixture(FOLDER_TEST);
  testGetUsersUtil.initialize(t);

  const TARGET = require(MODULE_TEST);
  TARGET.initialize(FOLDER_TEST);
  TARGET.once('abort', testGetUsersUtil.onAbort)
      .once('error', testGetUsersUtil.onError);
  try {
    const response = await TARGET.getUsers();   
    t.deepEqual(response, testGetUsersUtil.responseData);
    t.pass('Success getUsers');
  } catch(e) {
    console.log(e);
    t.fail('Failed getUsers');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetUsersUtil.onAbort);
    TARGET.removeListener('error', testGetUsersUtil.onError);
  }
});

// case not found data folder
test.serial('getUsersNotFoundDataFolder', async t => {
  testGetUsersUtil.deleteOldData(FOLDER_TEST);
  await testGetUsersUtil.createFixture(FOLDER_TEST);
  testGetUsersUtil.initialize(t);

  const TARGET = require(MODULE_TEST);
  TARGET.initialize(FOLDER_TEST + '_NotFound');
  TARGET.once('abort', testGetUsersUtil.onAbort)
      .once('error', testGetUsersUtil.onError);
  try {
    const response = await TARGET.getUsers();
    t.fail();
  } catch(e) {
    t.is(e.type, testGetUsersUtil.notFoundDataFolder.type);
    t.is(e.message, testGetUsersUtil.notFoundDataFolder.message);
    t.pass();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetUsersUtil.onAbort);
    TARGET.removeListener('error', testGetUsersUtil.onError);
  }
});

// test utility
var testGetUsersUtil = {
  t: null,

  initialize : function(t) {
    this.t = t;
  },

  notFoundDataFolder: {
    type: 'IO_ERROR',
    message: 'Not found ' + FOLDER_TEST + '_NotFound'
  },

  onError: function(e) {
    console.log('module test error: ', e);
  },

  onAbort: function(e) {
    console.log('module test aborted: ', e);
  },

  createFixture: async function(appFolder) {
    if (!fs.existsSync(appFolder)) {
      fs.mkdirSync(appFolder, 0o777);
    }

    const db = await sqlite.open(FOLDER_TEST + '\\database.db', { Promise });
    await db.run(`DELETE FROM userInformation;`);
    await db.run(`DELETE FROM knack;`);
    for (let i = 1; i <= 2; i++) {
      await db.run(
        `INSERT INTO userInformation('userId', 'account', 'password', 'name', 'role', 'mail') VALUES (?, ?, ?, ?, ?, ?);`,
        [i, 'admin', '123456', 'peter', 1, 'admin@gmail.com'] );
    }
    await db.close();
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testGetUsersUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  responseData : {
    'Users': [
      {  
        'userId':1,
        'account':'admin',
        'name': 'peter'
     }
    ]
  }
};
