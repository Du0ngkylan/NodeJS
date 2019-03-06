'use strict';

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('get-bookrack-tree');
const commandLock = require('./command-lock');

var accessor = {
  ACCEPTED_FIELD: [
    'bookrackItemName', 'bookrackItemType', 'bookrackItemId', 'bookrackItems'
  ],
  getBookrackTree: async function(constructionId) {
    try {
      await commandLock.lockSharedConstruction(constructionId);
      let constructionDetail =
          await bookrackAccessor.getConstructionDetail(constructionId);
      let bookrackItems =
          await bookrackAccessor.getBookrackItems(constructionId);
      bookrackItems.bookrackItems = await this.fillBookrackTree(
          constructionId, bookrackItems.bookrackItems);
      return {
        constructionId: constructionId,
        constructionName: constructionDetail.construction.constructionName,
        bookrackItems: bookrackItems.bookrackItems
      };
    } catch (ex) {
      logger.error("Failed to getBookrackTree", ex);
      throw ex;
    } finally {
      await commandLock.unLockSharedConstruction();
    }
  },

  fillBookrackTree: async function(
      constructionId, bookrackItems, parentBookrackItemId = undefined) {
    try {
      if (Array.isArray(bookrackItems)) {
        for (let i = 0; i < bookrackItems.length; i++) {
          if (bookrackItems[i].bookrackItems) {
            bookrackItems[i].bookrackItems = await this.fillBookrackTree(
                constructionId, bookrackItems[i].bookrackItems,
                bookrackItems[i].bookrackItemId);
          }
          
          let specialType = bookrackItems[i].specialType;

          // other fields
          let deleteField = [];
          for (let field in bookrackItems[i]) {
            if (this.ACCEPTED_FIELD.indexOf(field) === -1) {
              deleteField.push(field);
            }
          }
          deleteField.forEach(field => {
            delete bookrackItems[i][field];
          });

          switch (bookrackItems[i].bookrackItemType) {
            case 0:
              bookrackItems[i].bookrackItemType = 'BOOKRACK';
              bookrackItems[i].bookrackKind = specialType === 1 ? 'SYSTEM' : 'USER';
              break;
            case 1:
              bookrackItems[i].bookrackItemType = 'COMPARTMENT';
              break;
            case 2:
              bookrackItems[i].bookrackItemType = 'BOX';
              break;
            case 3:
              bookrackItems[i].bookrackItemType = 'ALBUM';
              break;
          }
          if (bookrackItems[i].bookrackItemType === 'ALBUM') {
            bookrackItems[i].albumInformation = {};
            let albumDetail = await bookrackAccessor.getAlbumDetail(
                constructionId, bookrackItems[i].bookrackItemId);
            if (!albumDetail.albumDetail.frameTotalCount) {
              albumDetail.albumDetail.frameTotalCount = 0;
            }
            bookrackItems[i].albumInformation.frameTotalCount =
                albumDetail.albumDetail.frameTotalCount;
            if (!albumDetail.albumDetail.dataFolderInformation) {
              albumDetail.albumDetail.dataFolderInformation = {};
            }
            if (!albumDetail.albumDetail.dataFolderInformation
                     .imageFileTotalCount) {
              albumDetail.albumDetail.dataFolderInformation
                  .imageFileTotalCount = 0;
            }
            bookrackItems[i].albumInformation.photoTotalCount =
                albumDetail.albumDetail.dataFolderInformation
                    .imageFileTotalCount;
            bookrackItems[i].albumInformation.organizeInfo = {};
            bookrackItems[i].albumInformation.organizeInfo =
                albumDetail.albumDetail.albumSettings.photoInfoTemplate;
          }
          bookrackItems[i].bookrackItemId =
            constructionId + '/' + bookrackItems[i].bookrackItemId;
      }
        return bookrackItems;
      } else {
        logger.error('Only accept array as parameter');
      }
    } catch (ex) {
      logger.error(ex);
    }
  }
};

module.exports = accessor;