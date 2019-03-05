'use strict';

// import test module
const test = require('ava');
// Node.js modules.
const path = require('path');
const fs = require('fs-extra');

const BOOKRACK_MODULE = '../../bookrack-accessor.js';
const GOYO19_APP_FOLDER = 'tests/test_data/data_test_resize_image';


// accessor test should be done in serial
// normal case
test.serial('createTumbnail JPG -> JPG', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.JPG');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.is(await response.updateCount, 1);
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('createTumbnail BMP -> JPG', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.BMP');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_BMP.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.is(await response.updateCount, 1);
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('createTumbnail TIF -> JPG', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.TIF');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_TIF.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.is(await response.updateCount, 1);
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('createTumbnail J2C -> JPG', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.J2C');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_J2C.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.is(await response.updateCount, 1);
  } catch (e) {
    console.log(e);
    t.fail();
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

// GIF is not compatible
test.serial('createTumbnail GIF -> JPG', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.GIF');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_GIF.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "Couldn't read image file.");
    t.is(e.type, "IO_ERROR");
    t.pass('Success createTumbnail GIF -> JPG');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

// not exist file
test.serial('Not exist file.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P1.JPG');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "Couldn't read image file.");
    t.is(e.type, "IO_ERROR");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

// validation error case
test.serial('sourceFile isn\'t int.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = 1;
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.JPG');
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "'args.sourceFile' is not specified");
    t.is(e.type, "INVALID_COMMAND");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('destFile isn\'t string.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.JPG');
    let destFile = 1;
    let width = 150;
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "'args.destFile' is not specified");
    t.is(e.type, "INVALID_COMMAND");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('width isn\'t int.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.JPG');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.JPG');
    let width = "150";
    let height = 100;
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "'args.width' is not specified");
    t.is(e.type, "INVALID_COMMAND");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

test.serial('height isn\'t int.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P9200028.JPG');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.JPG');
    let width = 150;
    let height = "100";
    const response = await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "'args.height' is not specified");
    t.is(e.type, "INVALID_COMMAND");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

// TPI
test.serial('TPI file.', async t => {
  testGetConstructionsUtil.initialize(t);
  const TARGET = require(BOOKRACK_MODULE);
  TARGET.initialize(GOYO19_APP_FOLDER);
  TARGET
    .once('abort', testGetConstructionsUtil.onAbortFunc)
    .once('error', testGetConstructionsUtil.onErrorFunc);
  try {
    let sourceFile = path.join(GOYO19_APP_FOLDER, 'P1.tpi');
    let destFile = path.join(GOYO19_APP_FOLDER, 'P9200028_JPG.TPI');
    let width = 150;
    let height = 100;
    await TARGET.resizeImage(sourceFile, destFile, width, height);
    t.fail('Not throw exception');
  } catch (e) {
    t.is(e.message, "TPI can not be resized");
    t.is(e.type, "INVALID_COMMAND");
    t.pass('Success Not exist file');
  } finally {
    await TARGET.finalize();
    TARGET.removeListener('abort', testGetConstructionsUtil.onAbortFunc);
    TARGET.removeListener('error', testGetConstructionsUtil.onErrorFunc);
  }
});

// test utility
var testGetConstructionsUtil = {
  t: null,

  initialize: function (t) {
    this.t = t;
  },

  onAbortFunc: function (e) {
    console.log('bookAccessor abort: ', e);
  },
  onErrorFunc: function (e) {
    console.log('bookAccessor error: ', e);
  },
};

test.before(t => {
  // テスト開始前
  //fs.removeSync(GOYO19_APP_FOLDER + '/P9200028_*.JPG');
});

test.beforeEach(t => {
  // 各テスト開始前
});

test.afterEach(t => {
  // 各テスト終了後
});

test.after(t => {
  // 全テスト終了後
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_JPG.JPG");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_BMP.JPG");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_GIF.JPG");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_TIF.JPG");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_J2C.JPG");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_JPG.BMP");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_BMP.BMP");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_GIF.BMP");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_TIF.BMP");
  fs.removeSync(GOYO19_APP_FOLDER + "/P9200028_J2C.BMP");
});
