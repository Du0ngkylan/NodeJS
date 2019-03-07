'use strict';

// Node.js modules.

// 3rd-parth modules.

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('get-deleted-photos');
const common = require('./connect-if-util');
const commandLock = require('./command-lock');

var deletedPhoto = {

  ACCEPTED_FIELD: [
    'frameNo', 'photoFile', 'originalPhotoFileName', 'photoInformation',
    'largeClassification', 'photoClassification', 'constructionType',
    'middleClassification', 'smallClassification', 'title',
    'classificationRemarks', 'shootingSpot', 'isRepresentative',
    'isFrequenceOfSubmission', 'contractorRemarks', 'fileSize', 'photoHash'
  ],

  MAPPED_FIELD: {
    '_toString(data, `displayNumber`)': 'frameNo',
    '_a(`photoFrames[0]["imageFile"]`)': 'photoFile',
    '_filename(data, `photoFrames[0]["imageFile"]`)': 'originalPhotoFileName',
    '_a(`constructionPhotoInformation["写真情報"]["写真-大分類"]`)': '_a(`photoInformation["largeClassification"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["写真区分"]`)': '_a(`photoInformation["photoClassification"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["工種"]`)': '_a(`photoInformation["constructionType"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["種別"]`)': '_a(`photoInformation["middleClassification"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["細別"]`)': '_a(`photoInformation["smallClassification"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["写真タイトル"]`)': '_a(`photoInformation["title"]`)',
    '_split(data, `constructionPhotoInformation["写真情報"]["工種区分予備"]`, ` `)': '_a(`photoInformation["classificationRemarks"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["撮影箇所"]`)': '_a(`photoInformation["shootingSpot"]`)',
    '_toBool(data,`constructionPhotoInformation["写真情報"]["代表写真"]`)': '_a(`photoInformation["isRepresentative"]`)',
    '_toBool(data, `constructionPhotoInformation["写真情報"]["提出頻度写真"]`)': '_a(`photoInformation["isFrequenceOfSubmission"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["受注者説明文"]`)': '_a(`photoInformation["contractorRemarks"]`)',
    '_a(`constructionPhotoInformation["写真情報"]["請負者説明文"]`)': '_a(`photoInformation["contractorRemarks"]`)',
    '_a(`photoFrames[0]["fileSize"]`)': 'fileSize',
    '_a(`photoFrames[0]["extraInfo"]["FILE:HASH"]`)': 'photoHash'
  },

  getBookrackItemDetail: async function (bookrackItems) {
      for (const item of bookrackItems.bookrackItems) {
        if (item.bookrackItemType === 3 && item.specialType === 1) {
          return item;
        } else {
          let child = await this.getBookrackItemDetail(item);
          if (child) {
            return child;
          }
        }
      };
      return null;
    },

    getDeletedPhoto: async function (constructionId) {
      try {
        await commandLock.lockSharedConstruction(constructionId);
        let bookrackItems = await bookrackAccessor.getBookrackItems(constructionId);
        let bookrackItemDetail = await this.getBookrackItemDetail(bookrackItems);
        if (bookrackItemDetail == null) {
          return {
            constructionId: constructionId,
            errorMessage : 'Not exist DeletedPhoto',
            error : 2
          };  
        }
        let albumId = bookrackItemDetail.bookrackItemId;
        let albumFrames = await bookrackAccessor.getAlbumFrames(constructionId, albumId);
        albumFrames = common.mapField(albumFrames.albumFrames, this.MAPPED_FIELD);
        albumFrames = common.filterProperty(albumFrames, this.ACCEPTED_FIELD, true);
        return {
          constructionId: constructionId,
          albumId: albumId.toString(),
          frames: albumFrames
        };
      } catch (ex) {
        logger.error("Failed to GetDeletedPhoto", ex);
        throw ex;
      } finally {
        await commandLock.unLockSharedConstruction();
      }
    }
};

module.exports = deletedPhoto;