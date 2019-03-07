'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
// const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const bookrackAccessor = require('sms-accessor');
// const goyoExcel = require('goyo-excel');
const goyoKinsoku = require('../../goyo-kinsoku');
const goyoAppFolder = require('../../goyo-appfolder');
const goyoDialog = require('../../goyo-dialog-utils');
const {AlbumWindowSet} = require('../../goyo-window-controller');
const lockFactory = require('../../lock-manager/goyo-lock-manager');
const logger = require('../../goyo-log')('excel-actions');
const { holdWindowsStop } = require('../../goyo-utils');

let lockManager;

// Internal functions.
function unimplemented() {
  logger.debug('menu-actions: unimplemented action is executed');
}

function findAlbum(items) {
  for (let item of items) {
    if (item.bookrackItemType === 3) {
      return true;
    } else if (findAlbum(item.bookrackItems)) {
      return true;
    }
  }
  return false;
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
    return bookrackItem.bookrackItems.reduce((acc, item) => acc.concat(getAlbumIdsUnderBookrackItem(item)), []);
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

async function  lockAlbums(parent, constructionId, albumIds) {
  var _lockAlbum = async function(albumId){
    let isLocked = false;
    isLocked = await lockManager.lockAlbum(albumId, true);
    if(!isLocked){
      await goyoDialog.showAlbumLockBusyDialog(parent);
    }
    return isLocked;
  }
  // acquire album lock
  let locked = false;
  let lockAlbumIds = [];
  let busyAlbumId = '';
  try {
    lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
    for (let albumId of albumIds) {
      locked = await _lockAlbum(albumId);
      if(!locked){
        busyAlbumId = albumId;
        break;
      }else{
        lockAlbumIds.push(albumId);
      }
    }
  } catch(e) {
    if (lockAlbumIds.length > 0) {
      unLockAlbum(lockAlbumIds);
    }
    logger.error('Failed to lockManager', e);
    throw e;
  } finally {
    if (!locked) {
      if (lockAlbumIds.length > 0) {
        unLockAlbum(lockAlbumIds);
      }
      throw new Error(`Lock busy.(albumId=${busyAlbumId})`);
    }
  }
};

function unLockAlbum(albumIds) {
  if (lockManager == null || albumIds == null)
    return;

  // release album lock
  for (let albumId of albumIds) {
    lockManager.lockAlbum(albumId, false)
      .then(() => {})
      .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)});
  }
};

const actions = {
  ///////////////////////////////////////////////////////////////////
  // Excel
  ///////////////////////////////////////////////////////////////////
  'EXCEL:CREATE-CHECKLIST-FOR-DISCUSSION': {
    async run(parent, target) {
      // Action for 「協議用チェックリストをEXCELで作成」
      unimplemented();
    },
  },
  'EXCEL:EXPORT-PHOTOS': {
    async run(parent, target) {
      // Action for 「工事写真一覧をEXCELへ出力...」
      unimplemented();
    },
  },
  'EXCEL:EXPORT-PHOTO-INFORMATIONS': {
    runnableWhileSharedLock : true,
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('EXCEL:EXPORT-PHOTO-INFORMATIONS', e);
        return false;
      }
    },
    async run(parent, target) {
      // Action for 「工事写真情報をEXCELへ出力...」
      let holder = holdWindowsStop();
      let targetAlbumIds = null;
      try {
        // Prepare the KinsokuData 
        let kinsokuData = goyoKinsoku.getKinsoku();
        await goyoKinsoku.updateKinsokuFile(kinsokuData);
        // 1. Lists all albums as target.
        let bookrackItems = await target.bookrackItems;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds =
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = [target.selectedAlbum];
        }
        // lock album
        await lockAlbums(parent, target.constructionId, targetAlbumIds);
        let result = await bookrackAccessor.getConstructionDetail(target.constructionId);
        let dataFolder = result.construction.dataFolder;
        let appFolder = goyoAppFolder.getAppFolder();
        // goyoExcel.initialize(dataFolder, appFolder);
        // await goyoExcel.outputConstructionPhotoInfo(target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('EXCEL:EXPORT-PHOTO-INFORMATIONS', e);
      } finally {
        // release album lock
        unLockAlbum(targetAlbumIds);
        holder.release();
      }
    },
  },
  'EXCEL:EXPORT-PHOTO-REGISTERED': {
    async run(parent, target) {
      // Action for 「工事写真登録状況をEXCELへ出力...」
      unimplemented();
    },
  },
  'EXCEL:EXPORT-PHOTO-SENTENCES': {
    runnableWhileSharedLock : true,
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('EXCEL:EXPORT-PHOTO-SENTENCES', e);
        return false;
      }
    },
    async run(parent, target) {
      // Action for 「写真文章をEXCELへ出力...」
      let holder = holdWindowsStop();
      let targetAlbumIds = null;
      try {
        
        let bookrackItems = await target.bookrackItems;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds =
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = [target.selectedAlbum];
        }
        // lock album
        await lockAlbums(parent, target.constructionId, targetAlbumIds);
        let result = await bookrackAccessor.getConstructionDetail(target.constructionId);
        let dataFolder = result.construction.dataFolder;
        let appFolder = goyoAppFolder.getAppFolder();
        // goyoExcel.initialize(dataFolder, appFolder);
        // await goyoExcel.outputPhotoDocuments(target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('EXCEL:EXPORT-PHOTO-SENTENCES', e);
      } finally {
        // release album lock
        unLockAlbum(targetAlbumIds);
        holder.release();
      }
    },
  },
  'EXCEL:REGISTER-PHOTO-INFORMATION': { // Action for 「工事写真情報一括登録...」
    runnableWhileSharedLock : true,
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('EXCEL:REGISTER-PHOTO-INFORMATION', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      let targetAlbumIds = null;
      try {
        // Prepare the KinsokuData 
        let kinsokuData = goyoKinsoku.getKinsoku();
        await goyoKinsoku.updateKinsokuFile(kinsokuData);
        // 1. Lists all albums as target.
        let bookrackItems = await target.bookrackItems;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds =
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = [target.selectedAlbum];
        }
        
        // lock album
        await lockAlbums(parent, target.constructionId, targetAlbumIds);

        // albumviewwindow close
        for(let albumId of targetAlbumIds){
          if (AlbumWindowSet.get(target.constructionId, albumId)){
            AlbumWindowSet.close(target.constructionId, albumId);
          }
        }

        let result = await bookrackAccessor.getConstructionDetail(target.constructionId);
        let dataFolder = result.construction.dataFolder;
        let appFolder = goyoAppFolder.getAppFolder();
        // goyoExcel.initialize(dataFolder, appFolder);
        // await goyoExcel.entryConstructionPhotoInfo(target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('EXCEL:REGISTER-PHOTO-INFORMATION', e);
      } finally {
        // release album lock
        unLockAlbum(targetAlbumIds);
        holder.release();
      }
    },
  },
  'EXCEL:REGISTER-PHOTO-SENTENCE': { // Action for 「写真文章一括登録...」
    runnableWhileSharedLock : true,
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('EXCEL:REGISTER-PHOTO-SENTENCE', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      let targetAlbumIds = null;
      try {
        // 1. Lists all albums as target.
        let bookrackItems = await target.bookrackItems;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds =
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = [target.selectedAlbum];
        }
        // lock album
        await lockAlbums(parent, target.constructionId, targetAlbumIds);
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '質問',
          '本機能を使用した場合、「文章フォントの部分変更」の設定は削除されツ\n―ルで指定した文章で上書きされます。\nツールを起動してよろしいですか？',
          'はい(&Y)',
          'いいえ(&N)',
          true);
        if (result){
          // albumviewwindow close
          for(let albumId of targetAlbumIds){
            if (AlbumWindowSet.get(target.constructionId, albumId)){
              AlbumWindowSet.close(target.constructionId, albumId);
            }
          }
          let result = await bookrackAccessor.getConstructionDetail(target.constructionId);
          let dataFolder = result.construction.dataFolder;
          let appFolder = goyoAppFolder.getAppFolder();
          // goyoExcel.initialize(dataFolder, appFolder);
          // await goyoExcel.entryPhotoDocuments(target.constructionId, targetAlbumIds);
        }
      } catch (e) {
        logger.error('EXCEL:REGISTER-PHOTO-SENTENCE', e);
      } finally {
        // release album lock
        unLockAlbum(targetAlbumIds);
        holder.release();
      }
    },
  },
};


module.exports = actions;