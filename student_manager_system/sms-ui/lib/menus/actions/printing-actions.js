'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const goyoDialog = require('../../goyo-dialog-utils');
const printOperation = require('../../print-operation');
const { shellopen, holdWindowsStop } = require('../../goyo-utils');
const goyoTemporal = require('../../goyo-temporal');
const logger = require('../../goyo-log')('printing-actions');
const MENU_TYPE = require('../goyo-menu-type');
const { isTiffAlbumFrame } = require('./action-common');


// Internal functions.
function unimplemented() {
  console.log('menu-actions: unimplemented action is executed');
}

function findBookrackItem(bookrackItems, id) {
  for (let item of bookrackItems) {
    if (item.bookrackItemId === id) {
      return item;
    } else if (item.bookrackItems) {
      let result = findBookrackItem(item.bookrackItems, id);
      if (result) return result;
    } else {
      // Do nothing.
    }
  }
  return null;
}

function getAlbumIdsUnderBookrackItem(bookrackItem) {
  if (bookrackItem.bookrackItemType === 3) {
    return [bookrackItem.bookrackItemId];
  } else if (bookrackItem.bookrackItems) {
    return bookrackItem.bookrackItems.reduce((acc,item) => acc.concat(getAlbumIdsUnderBookrackItem(item)), []);
  } else {
    return [];
  }
}

function getAlbumIdsUnderContainer(bookrackItems, containerId) {
  let item = findBookrackItem(bookrackItems, containerId);
  if (item) {
    return getAlbumIdsUnderBookrackItem(item);
  } else {
    return [];
  }
}


const actions = {
  ///////////////////////////////////////////////////////////////////
  // Printing
  ///////////////////////////////////////////////////////////////////
  //'PRINTING:PRINT-PHOTO-WITH-INFORMATION': {
  //  async run(parent, target) {
  //    // Action for 「画像情報を印刷...」
  //    unimplemented();
  //  },
  //},
  'PRINTING:PRINT-PHOTO': { // Action for 「画像を印刷...」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      if (type === MENU_TYPE.PHOTOVIEW) {
        return true;
      }
      let [ { albumFrame } ] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      return true;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let [ { albumFrame } ] = await target.frameInformations;
        if (albumFrame.photoFrames.length === 0) {
          await goyoDialog.showErrorMessageDialog(
            parent, '画像印刷', '画像を含まないフレームは印刷できません。', 'OK');
        }

        let tmpPath = await goyoTemporal.makeTemporal(albumFrame.photoFrames[0].imageFile);
        let result = shellopen(parent, tmpPath, shellopen.PRINT);
        if (!result) {
          await goyoDialog.showErrorMessageDialog(
            parent, '画像印刷', 'Windows標準の印刷アプリケーションの起動に失敗しました。', 'OK');
        }
      } finally {
        holder.release();
      }
    }
  },

  'PRINTING:PRINT-ALBUM': { // Action for 「工事写真台帳印刷...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      if (target.albumIds.length <= 0) return;

      let [ albumDetail ] = await target.albumDetails;
      let textMode = (albumDetail.albumSettings.sentence.displayType===1) ? 'photo_information' : 'photo_sentence'

      let previewWin = await printOperation.startPreview(parent, target.constructionId, target.albumIds[0], textMode);
    },
  },

  'PRINTING:PRINT-ALBUMS': { // Action for 「工事写真台帳連続印刷...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let bookrackItems = await target.bookrackItems;
        logger.debug(`bookrackId: ${target.bookrackId}`);
        logger.debug(`compartmentId: ${target.compartmentId}`);
        logger.debug(`boxIds: ${target.boxIds}`);
        logger.debug(`albumIds: ${target.albumIds}`);

        // 1. Lists all albums as target.
        let targetAlbumIds;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds = 
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.bookrackId);
        }
        logger.debug(`targetAlbumIds: ${targetAlbumIds}`);
        if (targetAlbumIds.length === 0) {
          await goyoDialog.showWarningMessageDialog(
            parent, '工事写真台帳印刷', '印刷対象のアルバムがありません。', 'OK');
          return;
        }

        // 2. Show first dialog.
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, '工事写真台帳印刷',
          `${targetAlbumIds.length}冊のアルバムを連続印刷します。\nよろしいですか？`,
          'はい(&Y)', 'いいえ(&N)', true);
        if (!result) return;

        // 3. Loop all albums for displaying print preview window.
        let i=0;
        while (true) {
          let albumId = targetAlbumIds[i];

          // 3.1. show preview window
          let { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, albumId);
          let textMode = (albumDetail.albumSettings.sentence.displayType===1) ? 'photo_information' : 'photo_sentence'
          let previewWin = await printOperation.startPreview(parent, target.constructionId, albumId, textMode);
          if (previewWin) {
            await new Promise(r => previewWin.once('closed', r));
          }

          i++
          if (i >= targetAlbumIds.length) break;

          // 3.2. show intermediate dialog
          let result = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent, '工事写真台帳印刷',
            `連続印刷中（${i}／${targetAlbumIds.length}冊）の処理を終了しました。\n次のアルバムを印刷します。\nよろしいですか？`,
            'はい(&Y)', 'いいえ(&N)', true);
          if (!result) return;
        }

        // 4. show last dialog.
        await goyoDialog.showSimpleMessageDialog(
          parent, '工事写真台帳印刷', `${targetAlbumIds.length}冊の印刷処理が終了しました。`, 'OK');

      } catch(e) {
        logger.error('PRINTING:PRINT-ALBUMS', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;
