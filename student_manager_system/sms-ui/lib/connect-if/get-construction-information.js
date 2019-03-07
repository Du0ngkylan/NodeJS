
'use strict';

// Node.js modules.
const path = require('path');

// 3rd-parth modules.

// Goyo modules.
const common = require('./connect-if-util');
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('get-construction-information');
const commandLock = require('./command-lock');

const GOYO19_APP_FOLDER = require('../goyo-appfolder').getAppFolder();

var construction_info = {
  getConstructionInformation: async function (constructionId){
    try {
      await commandLock.lockSharedConstruction(constructionId);
      let constructionDetail = await bookrackAccessor.getConstructionDetail(constructionId);

      let constructionSettings = await bookrackAccessor.getConstructionSettings(constructionId);
      let position = constructionSettings.constructionSettings.constructionPhoto.photoTreePattern !== 1 ? "upper" : "lower";

      const uiParam = require('../goyo-ui-parameters');
      await uiParam.initialize(path.join(GOYO19_APP_FOLDER, 'ui-param.json'));

      let bwParam = uiParam('bookrack_window', constructionId);
      let { bookracks } = await bookrackAccessor.getBookracks(constructionId);
      let bookrackId = 1; // sysytem bookrack
      if (bwParam && bwParam.lastShownBookrackId) {
        bookrackId = bwParam.lastShownBookrackId;
      } else {
        for (let bookrackItem of bookracks) {
          if (bookrackItem.specialType === 0) {
            bookrackId = bookrackItem.bookrackItemId;
            break;
          }
        }
      }
      //do not finlalize, not to overwrite settings
      //await uiParam.finalize();
      let lastShownBookrackId = common.joinIds(constructionId, bookrackId);
      constructionDetail.construction.lastShownBookrackId = lastShownBookrackId;
      constructionDetail.construction.photoClassificationPosition = position;
      return constructionDetail.construction;
    } catch (ex) {
      logger.error("Failed to GetConstructionInformation", ex);
      throw ex;
    } finally {
      await commandLock.unLockSharedConstruction();
    }
  }
}

module.exports = construction_info;