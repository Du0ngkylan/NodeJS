'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird')

const BOOKRACK_MODULE = '../../../accessor.js';

const GOYO19_APP_FOLDER = 'tests\\test_data\\data_test_get_schools';

// accessor test should be done in serial
// normal case
test.serial('getSchools', async t => {
  testGetSchoolsUtil.deleteOldData(GOYO19_APP_FOLDER);
  testGetSchoolsUtil.initialize(t);

  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET.once('abort', testGetSchoolsUtil.onAbort)
      .once('error', testGetSchoolsUtil.onError);
  try {
    const response = await TARGET.getSchools();
    console.log(response); 
    t.deepEqual(response, testGetSchoolsUtil.responseData);
    t.pass('Success getSchools');
  } catch(e) {
    console.log(e);
    t.fail('Failed getSchools');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetSchoolsUtil.onAbort);
    TARGET.removeListener('error', testGetSchoolsUtil.onError);
  }
});

// test utility
var testGetSchoolsUtil = {
  t: null,

  initialize : function(t) {
    this.t = t;
  },

  onError: function(e) {
    console.log('Accessor error: ', e);
  },

  onAbort: function(e) {
    console.log('Accessor aborted: ', e);
  },

  deleteOldData: function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + '\\' + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          testGetSchoolsUtil.deleteOldData(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  responseData : {
    'schools':{
        'address': "HaNoi",
        'schoolId': 1,
        'schoolName': "HUS",
        'schoolNumber': 2020
     }
  }
};
