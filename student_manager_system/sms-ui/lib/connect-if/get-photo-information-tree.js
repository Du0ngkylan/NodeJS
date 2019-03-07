'use strict';

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('get-photo-information-tree');
const common = require('./connect-if-util');
const commandLock = require('./command-lock');
let photoInformationTreeUtil = require('./../photo-information-tree/photo-information-tree');

var accessor = {
  getPhotoInformationTree: async function(constructionId, itemId = 1) {
    try {
      await commandLock.lockSharedConstruction(constructionId);
      let constructionSettings =
          await bookrackAccessor.getConstructionSettings(constructionId);
      photoInformationTreeUtil.setPattern(constructionSettings.constructionSettings.constructionPhoto.photoTreePattern);
      let photoInformationTree = await photoInformationTreeUtil.getTreeInfoForConnect(constructionId);

      if (constructionSettings.constructionSettings.constructionPhoto
                  .photoTreePattern === 0 ||
          constructionSettings.constructionSettings.constructionPhoto
                  .photoTreePattern === 1) {
        if (!constructionSettings.constructionSettings.constructionPhoto
                 .largeClassificationValue) {
          throw new ReferenceError('Invalid Large Classification Value');
        }
        const photoChild = photoInformationTree.children;
        photoInformationTree.children = [{
          itemId: '0',
          itemName: constructionSettings.constructionSettings.constructionPhoto
                        .largeClassificationValue,
          kind: "largeClassification",
          children: photoChild
        }];
        return photoInformationTree;
      } else if (
          constructionSettings.constructionSettings.constructionPhoto
                  .photoTreePattern === 2 ||
          constructionSettings.constructionSettings.constructionPhoto
                  .photoTreePattern === 3) {
        return photoInformationTree;
      } else {
        throw new ReferenceError('Invalid photoTreePattern');
      }

    } catch (ex) {
      logger.error("Failed to getPhotoInformationTree", ex);
      throw ex;
    } finally {
      await commandLock.unLockSharedConstruction();
    }
  }
};

module.exports = accessor;