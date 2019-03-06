'use strict';

// Node modules.
const fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('get-register-state');
const commandLock = require('./command-lock');

// private function

function outputProgress(progress) {
  console.log(JSON.stringify(progress))
}

const accessor = {
  async getRegisterState(constructionId, jsonfile) {
    try {
      await commandLock.lockSharedConstruction(constructionId);
      await commandLock.lockExclusiveConstruction();

      const data = await fse.readFile(jsonfile);
      const filePaths = JSON.parse(data);

      let response = await bookrackAccessor.getConnectRegisterState(constructionId, filePaths, 
        (l, done, total, working)=>{
          let progress = {
            "done" : done,
            "total" : total,
          };
          outputProgress(progress);
      });

      return response;
    } catch (ex) {
      logger.error('Failed to getRegisterState', ex);
      throw ex;
    } finally {
      await commandLock.unLockExclusiveConstruction();
      await commandLock.unLockSharedConstruction();
    }
  }
};

module.exports = accessor;
