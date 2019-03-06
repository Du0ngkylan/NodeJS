'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Electron modules.
const { app, nativeImage } = require('electron');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const {
  viewMode,
  BookrackViewWindowSet
} = require('../../goyo-window-controller');
const settingsOperation = require('../../goyo-settings-operation');
const goyoDialog = require('../../goyo-dialog-utils');
const programSettings = require('../../goyo-program-settings');
const goyoAlbumOperation = require('../../goyo-album-operation');
const goyoAppDefaults = require('../../goyo-app-defaults');
const goyoActionCommon = require('./action-common');
const logger = require('../../goyo-log')('album-actions');
const { directoryWalk, holdWindowsStop, waitEffect } = require('../../goyo-utils');
const lockFactory = require('../../lock-manager/goyo-lock-manager');

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

const actions = {
  ///////////////////////////////////////////////////////////////////
  // album
  ///////////////////////////////////////////////////////////////////
  'ALBUM:NEW-FROM-FILE': {
    async run(parent, target) {
      // Action for 「新しいアルバムにファイルを指定して追加...」
      assert(target.bookrackId !== undefined);
      let holder = holdWindowsStop();
      try {
        await settingsOperation.createAlbumFromFile(parent, target);
      } catch (e) {
        logger.error('ALBUM:NEW-FROM-FILE', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:NEW-FROM-FOLDER': {
    async run(parent, target) {
      // Action for 「新しいアルバムにフォルダを指定して追加...」
      assert(target.bookrackId !== undefined);
      let holder = holdWindowsStop();
      try {
        await settingsOperation.createAlbumFromFolder(parent, target);
      } catch (e) {
        logger.error('ALBUM:NEW-FROM-FOLDER', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC': { // Action for 「アルバムの整理並べ替え撮影日時昇順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let albumFrame of album.albumFrames) {
              if (albumFrame.photoFrames.length > 0 && albumFrame.photoFrames[0].shootingDate) {
                albumFrame.shooting = albumFrame.photoFrames[0].shootingDate;
              } else {
                albumFrame.shooting = '';
              }
            }
            album.albumFrames.sort(compareValuesShootingDate('shooting'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC', error);
      } finally {
        if(waitCursor){
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC': { // Action for 「アルバムの整理並べ替え撮影日時降順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let albumFrame of album.albumFrames) {
              if (albumFrame.photoFrames.length > 0 && albumFrame.photoFrames[0].shootingDate) {
                albumFrame.shooting = albumFrame.photoFrames[0].shootingDate;
              } else {
                albumFrame.shooting = '';
              }
            }
            album.albumFrames.sort(compareValuesShootingDate('shooting', 'desc'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILENAME-ASC': { // Action for 「アルバムの整理並べ替えファイル名昇順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileName = album.albumFrames[i].photoFrames[0].fileArias;
              } else {
                album.albumFrames[i].fileName = ""
              }
            }
            album.albumFrames.sort(compareValues('fileName'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILENAME-ASC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILENAME-DESC': { // Action for 「アルバムの整理並べ替えファイル名降順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileName = album.albumFrames[i].photoFrames[0].fileArias;
              } else {
                album.albumFrames[i].fileName = ""
              }
            }
            album.albumFrames.sort(compareValues('fileName', 'desc'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILENAME-DESC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILESIZE-ASC': { // Action for 「アルバムの整理並べ替えファイルのサイズ昇順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileSize = album.albumFrames[i].photoFrames[0].extraInfo['FILE:FileSize'];
              } else {
                album.albumFrames[i].fileSize = ""
              }
            }
            album.albumFrames.sort(compareValues('fileSize'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILESIZE-ASC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILESIZE-DESC': { // Action for 「アルバムの整理並べ替えファイルのサイズ降順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileSize = album.albumFrames[i].photoFrames[0].extraInfo['FILE:FileSize'];
              } else {
                album.albumFrames[i].fileSize = ""
              }
            }
            album.albumFrames.sort(compareValues('fileSize', 'desc'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILESIZE-DESC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILETIME-ASC': { // Action for 「アルバムの整理並べ替えファイル日時昇順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileDate = album.albumFrames[i].photoFrames[0].extraInfo['FILE:FileDate'];
              } else {
                album.albumFrames[i].fileDate = ""
              }
            }
            album.albumFrames.sort(compareValues('fileDate'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILETIME-ASC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:SORTOUT-BY-FILETIME-DESC': { // Action for 「アルバムの整理並べ替えファイル日時降順」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'この操作を実行すると、画像の順序が変更されるのでアルバム上の画像位置が変わります。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (result) {
          let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '質問',
            '本当に実行してよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (resultAgain) {
            waitCursor = waitEffect(parent);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            for (let i = 0; i < album.albumFrames.length; i++) {
              if (album.albumFrames[i].photoFrames[0]) {
                album.albumFrames[i].fileDate = album.albumFrames[i].photoFrames[0].extraInfo['FILE:FileDate'];
              } else {
                album.albumFrames[i].fileDate = ""
              }
            }
            album.albumFrames.sort(compareValues('fileDate', 'desc'));
            await goyoAlbumOperation.updateFrameOrder(target.constructionId, target.albumIds[0], album.albumFrames);
          }
        }
      } catch (error) {
        logger.error('ALBUM:SORTOUT-BY-FILETIME-DESC', error);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
      }
    },
  },
  'ALBUM:REMOVE-EMPTY-FRAMES': { // Action for 「アルバムの整理アルバムを整理」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let progressWindow;
      let lockManager = null;
      let holder = holdWindowsStop();
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          goyoAppDefaults.DIALOG_TITLE,
          '画像がない場所を詰めて、画像がないページを削除します。\nこの結果、画像の順序が変更されるのでアルバム上の画像の\n位置が変わります\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (!result) {
          return;
        }

        let resultAgain = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          goyoAppDefaults.DIALOG_TITLE,
          '本当に実行してよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (!resultAgain) {
          return;
        }

        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        let { albumFrames } = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
        if (albumFrames.every(f => f.photoFrames.length === 0)) {
          return;
        }

        let deleteTargets = albumFrames
          .filter(f => f.photoFrames.length === 0)
          .map(f => f.albumFrameId);

        await goyoAlbumOperation.deleteFrames(target.constructionId, target.albumIds[0], deleteTargets, true, canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });
      } catch (error) {
        logger.error('ALBUM:REMOVE-EMPTY-FRAMES', error);
      } finally {
        if (progressWindow) {
          progressWindow.close();
        }
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
        holder.release();
      }
    },
  },
  'ALBUM:EDIT-PAGES': { // Action for 「アルバムの整理ページ数を調整ページ数を調整...」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let holder = holdWindowsStop();
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }
        await goyoAlbumOperation.adjustPageNumber(parent, target);
      } catch (e) {
        logger.error('ALBUM:EDIT-PAGES', e);
      } finally {
        if (lockManager != null) {
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => { })
            .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
        }
        holder.release();
      }
    },
  },
  'ALBUM:DIVIDE': { // Action for 「アルバムの整理ページ数を調整１冊を分けて２冊にする...」
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let result = await goyoAlbumOperation.splitAlbum(parent, target);
      } catch (e) {
        logger.error('ALBUM:DIVIDE', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:COMBINE': { // Action for 「アルバムの整理ページ数を調整２冊を合わせて１冊にする...」
    async isRunnable(type, target) {
      if (target.albumIds.length > 0) {
        const bookrackItems = await target.bookrackItems;
        const item = findMatchRecursive(bookrackItems, item => item.bookrackItemType === 3 && item.bookrackItemId !== target.albumIds[0]);
        return item != null;
      }

      function findMatchRecursive(bookrackItems, matcher) {
        for (let item of bookrackItems) {
          if (matcher(item)) {
            return item;
          } else if (item.bookrackItems instanceof Array) {
            let r = findMatchRecursive(item.bookrackItems, matcher);
            if (r != null) return r;
          }
        }
        return null;
      }
    },
    async run(parent, target) {
      // let holder = holdWindowsStop();
      let wait = null;
      try {
        wait = waitEffect(parent);
        await goyoAlbumOperation.mergeAlbum(parent, target);
        // await clearEmptyBoxsAndTraysThenRefreshBookrack(target.constructionId);
      } catch (e) {
        logger.log('ALBUM:COMBINE', e);
      } finally {
        // holder.release();
        if (wait) {
          wait.release();
        }
      }
    },
  },
  'ALBUM:EDIT-SETTING': { // Action for 「アルバムの設定...」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let result = await settingsOperation.editAlbumDetailSetting(
          parent,
          target.constructionId,
          target.albumIds[0]);
      } catch (e) {
        logger.error('ALBUM:EDIT-SETTING', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:CHANGE-LAYOUT-ALL': { // Action for 「アルバムレイアウト一括変更...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        let bookrack = bookrackItems.find(item => item.bookrackItemId === target.bookrackId);
        if (bookrack) {
          return goyoActionCommon.findAlbumInBookrackItems(bookrack.bookrackItems);
        } else {
          return false;
        }
      } catch (e) {
        logger.error('ALBUM:CHANGE-LAYOUT-ALL', e);
        return false;
      }
    },
    async run(parent, target) {
      let progressWindow;
      let holder = holdWindowsStop();
      try {

        let targetAlbumIds = await goyoActionCommon.listTargetAlbums(target);
        if (targetAlbumIds.length === 0) {
          await goyoDialog.showWarningMessageDialog(
            parent, goyoAppDefaults.DIALOG_TITLE, '変更対象のアルバムがありません。', 'OK');
          return;
        }

        let newSettings = await goyoDialog.showAllAlbumLayoutChangingDialog(parent);
        if (!!newSettings && (newSettings.layout.albumTemplate !== undefined ||
          newSettings.matDesign.matType !== undefined ||
          newSettings.sentence.font.fontName !== undefined ||
          newSettings.sentence.font.fontSize !== undefined ||
          newSettings.sentence.font.fontStyle !== undefined ||
          newSettings.sentence.font.fontBinary !== undefined ||
          newSettings.sentence.font.fontWeight !== undefined)) {
          progressWindow = goyoDialog.showProgressDialog(parent);

          let done = 0;
          for (const albumId of targetAlbumIds) {
            let { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, albumId);
            if (albumDetail) {
              if (newSettings.layout.albumTemplate !== undefined) {
                albumDetail.layout.albumTemplate = newSettings.layout.albumTemplate;
              }
              if (newSettings.matDesign.matType !== undefined) {
                albumDetail.albumSettings.matDesign.matType = newSettings.matDesign.matType;
              }
              if (newSettings.sentence.font.fontName !== undefined) {
                albumDetail.albumSettings.sentence.font.fontName = newSettings.sentence.font.fontName;
              }
              if (newSettings.sentence.font.fontSize !== undefined) {
                albumDetail.albumSettings.sentence.font.fontSize = newSettings.sentence.font.fontSize;
              }
              if (newSettings.sentence.font.fontStyle !== undefined) {
                albumDetail.albumSettings.sentence.font.fontStyle = newSettings.sentence.font.fontStyle;
              }
              if (newSettings.sentence.font.fontBinary !== undefined) {
                albumDetail.albumSettings.sentence.font.fontBinary = newSettings.sentence.font.fontBinary;
              }
              if (newSettings.sentence.font.fontWeight !== undefined) {
                albumDetail.albumSettings.sentence.font.fontWeight = newSettings.sentence.font.fontWeight;
              }
              await goyoAlbumOperation.updateAlbumSetting(
                target.constructionId,
                albumId,
                albumDetail.albumSettings,
                albumDetail.layout.albumTemplate);
              done++;
              progressWindow.setProgress(done / targetAlbumIds.length);
            }
          }
        }
      } catch (e) {
        logger.error('ALBUM:CHANGE-LAYOUT-ALL', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        holder.release();
      }
    },
  },
  'ALBUM:DELETE': { // Action for 「アルバムを削除」
    async isRunnable(type, target) {
      return (typeof target.compartmentId === 'number') ||
        (target.boxIds.length === 1 && target.albumIds.length === 0) ||
        (target.boxIds.length === 0 && target.albumIds.length > 0);
    },
    async run(parent, target) {
      assert(target.constructionId !== undefined);
      assert(target.bookrackId !== undefined);
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let error = null;
      let holder = holdWindowsStop();
      try {

        let constructionId = target.constructionId;
        let bookrackItems = (await bookrackAccessor.getBookrackItems(constructionId)).bookrackItems;

        // 1. Lists all albums as target.
        let targetAlbumIds;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else {
          targetAlbumIds =
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        }
        logger.debug(`delete target albumIds: ${targetAlbumIds}`);
        logger.debug(JSON.stringify(targetAlbumIds));
        if (targetAlbumIds.length === 0) {
          await goyoDialog.showWarningMessageDialog(
            parent, 'アルバムの削除', '削除対象のアルバムがありません。', 'OK');
          return;
        }

        // lock album item
        lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
        isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(() => { return true })
        .catch((e) => {
          return false;
        });
        if (!isLockAlbumItemdb) {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return;
        }  

        // 2. delete procedure for each albums
        for (let albumId of targetAlbumIds) {
          let progressWindow;
          let deletedAlbum = bookrackAccessor.findBookrackItem(albumId, bookrackItems);
          // show first dialog,   and break loop if user click cancel.
          let albumDetail = (await bookrackAccessor.getAlbumDetail(constructionId, albumId)).albumDetail;
          let count = albumDetail.dataFolderInformation.imageFileTotalCount;
          const confirmResult = await goyoDialog.showDeleteConfirmDialog(
            parent,
            {
              title: 'データの削除',
              message: `アルバム「${deletedAlbum.bookrackItemName}」を削除します。`,
              question: '削除を実行しますか？',
              information: `このアルバムには${count}枚の画像が入っています。`,
              type: 3,
              hasCancel: true,
              okTitle: '削除',
            }
          );

          if (!confirmResult) {
            break;
          }

          // show second dialog,   and break loop if user click cancel.
          const confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
            'データの削除', '本当に削除してよろしいですか？', 'はい(&Y)', 'いいえ(&N)');
          if (!confirm) {
            break;
          }

          try {
            let canceller = { cancel: false };
            progressWindow = goyoDialog.showProgressDialog(parent, () => {
              canceller.cancel = true;
            });

            let deletedFrameIds = await goyoAlbumOperation.deleteFramesAll(constructionId, albumId, null, canceller, (done, total) => {
              progressWindow.setProgress(done / (total + 1));
            });

            if (!canceller.cancel) {
              await goyoAlbumOperation.deleteAlbums(constructionId, [albumId]);
              progressWindow.setProgress(1);

              // empty container?
              let container = bookrackAccessor.findBookrackItem(deletedAlbum.parentBookrackItemId, bookrackItems);
              removeInContainer(container, albumId);
              if (container.bookrackItemType === 1 || container.bookrackItemType === 2) {
                // and remove parent box or compartment if it became empty.
                if (container.bookrackItems.length === 0) {
                  await settingsOperation.deleteEmptyContainer(constructionId, container.bookrackItemId);

                  // empty parent compartment?
                  if (container.bookrackItemType === 2) {
                    let compartmentId = container.parentBookrackItemId;
                    let compartment = bookrackAccessor.findBookrackItem(compartmentId, bookrackItems);
                    if (compartment.bookrackItemType === 0) {
                      return; // parent bookrack
                    }
                    removeInContainer(compartment, container.bookrackItemId);

                    if (compartment.bookrackItems.length === 0) {
                      await settingsOperation.deleteEmptyContainer(constructionId, compartmentId);
                    }
                  }
                }
              }
            }
          } catch (e) {
            logger.error('ALBUM:DELETE', e);
            error = e;
            return false;
          } finally {
            if (lockManager != null) {
              if (isLockAlbumItemdb) {
                // release construction lock
                await lockManager.lockAlbumItemDatabase(false)
                .then(()=>{})
                .catch((e)=>{
                  logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
                });
              }
            }
            await progressWindow.close();
            if (error != null) {
              await goyoDialog.showErrorMessageDialog(
                parent, goyoAppDefaults.DIALOG_TITLE,
                'アルバムを削除できませんでした。', 'OK');  
            }
          }
        }
      } catch (e) {
        logger.error('ALBUM:DELETE', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:NEW': {
    async run(parent, target) {
      // Action for 「アルバムを作成...」
      assert(target.constructionId !== undefined);
      assert(target.bookrackId !== undefined);
      let holder = holdWindowsStop();
      try {
        await settingsOperation.createAlbum(parent, target);
      } catch (e) {
        logger.error('ALBUM:NEW', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:DUPLICATE': {
    async run(parent, target) {
      // Action for 「アルバムを複製」
      let constructionId = target.constructionId;
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let lockAlbumIds = new Set();
      let error = null;
      let failLockAlbum = false;
      let waitCursor;
      let unLockAlbums = ()=> {
        if (lockManager != null) {
          lockAlbumIds.forEach((aId)=> {
            lockManager.lockAlbum(aId, false)
            .then(()=>{})
            .catch((e)=>{logger.error('Failed to unlockAlbum', e);});
          });
          lockAlbumIds.clear();  
        }
      };
      // Because there are no way to show progress dialog, we use effectCursor() function instead of progress
      // Reference to task 10935, action [ALBUM: DUPLICATE]
      waitCursor = waitEffect(parent);
      try {

        // show dialog.         
        const confirmResult = await goyoDialog.showDuplicateDialog(
          parent, {});
        if (!confirmResult.isOK) {
          return;
        }

        // lock exlusive construction (album db)
        lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
        isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(() => { return true })
        .catch((e) => {
          return false;
        });
        if (!isLockAlbumItemdb) {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return;
        }  
        
        let albumDetails = await target.albumDetails;
        let bookrackItems = await target.bookrackItems;
        let bookrackItemCurrent = findBookrackItem(bookrackItems, albumDetails[0].albumId);

        let newAlbumDetails = Object.assign({}, albumDetails[0]);
        newAlbumDetails.albumId = 0;
        newAlbumDetails.parentBookrackItemId = bookrackItemCurrent.parentBookrackItemId;
        newAlbumDetails.albumSettings.initialPageNumber = 0;
        delete newAlbumDetails.frameTotalCount;

        let covers = {
          "frontCover": newAlbumDetails.frontCover,
          "backCover": newAlbumDetails.backCover,
          "spineCover": newAlbumDetails.spineCover
        };

        // lock source album
        if (await lockManager.lockAlbum(albumDetails[0].albumId, true)) {
          lockAlbumIds.add(albumDetails[0].albumId);
        } else {
          failLockAlbum = true;
          throw new Error('lock busy')
        }

        let newAlbumId = await goyoAlbumOperation.createAlbums(target.constructionId,
          bookrackItemCurrent.parentBookrackItemId,
          bookrackItemCurrent.bookrackItemId, 1,
          newAlbumDetails.albumSettings,
          newAlbumDetails.layout.albumTemplate, covers, 'after');

        // lock new album
        if (await lockManager.lockAlbum(newAlbumId[0], true)) {
          lockAlbumIds.add(newAlbumId[0]);
        } else {
          failLockAlbum = true;
          throw new Error('lock busy')
        }
  
        let albumFramesOld = (await bookrackAccessor.getAlbumFrames(target.constructionId, albumDetails[0].albumId)).albumFrames;
        let albumFramesCurrent = JSON.parse(JSON.stringify(albumFramesOld));
        for (let albumFrame of albumFramesCurrent) {
          if (confirmResult.isOK === true && confirmResult.isTPIMode === true) {
            let reverseFramePhoto = goyoAlbumOperation.reservedPhotoFrame;
            for (let photoFrame of albumFrame.photoFrames) {
              if (photoFrame.hasOwnProperty('imageFile')) {
                delete photoFrame.albumItemId;
                delete photoFrame.shootingDate;
                delete photoFrame.extraInfo;

                photoFrame.photoFrameId = reverseFramePhoto.photoFrameId;
                photoFrame.imageFile = reverseFramePhoto.imageFile;
                photoFrame.thumbnail = reverseFramePhoto.imageFile;
                photoFrame.height = reverseFramePhoto.height;
                photoFrame.width = reverseFramePhoto.width;
                photoFrame.fileArias = reverseFramePhoto.fileArias;
                photoFrame.fileSize = reverseFramePhoto.fileSize;
              }
            }
          }
        }
        
        await goyoAlbumOperation.insertFrames(target.constructionId, newAlbumId[0], albumFramesCurrent);

      } catch (e) {
        logger.error('ALBUM:DUPLICATE', e);
        error = e;
      } finally {
        unLockAlbums();
        if (isLockAlbumItemdb) {
          // release construction lock
          await lockManager.lockAlbumItemDatabase(false)
          .then(()=>{})
          .catch((e)=>{
            logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
          });
        }
        if (error != null && failLockAlbum === true) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
        }
        if (waitCursor) {
          waitCursor.release();
        }
        if (error != null) {
          throw error;
        }
      }
    },
  },
  'ALBUM:REMOVE-EMPTIES': { // Action for 「空のアルバムを削除...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    async run(parent, target) {
      let progressWindow;
      let holder = holdWindowsStop();
      try {
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          '画像が入っていないアルバムを削除します。\nよろしいですか？',
          'はい(&Y)',
          'いいえ(&N)',
        );
        if (!result) {
          return;
        }
        // Implement deleting empty album
        let { bookrackItems } = await bookrackAccessor.getBookrackItems(target.constructionId);
        let albumsInBookrack = await getAlbumsFromBookrack(bookrackItems, []);
        let isAnyItemRemoved = false;
        let albumIds = [];
        let canceller = {
          cancel: false
        };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        }); 
        for (let album of albumsInBookrack) {
          let albumId = album.bookrackItemId;
          let { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, albumId);
          if(albumDetail.dataFolderInformation.imageFileTotalCount === 0) {
            albumIds.push(albumId);
            isAnyItemRemoved = true;
          }
        }

        if(isAnyItemRemoved){
          await goyoAlbumOperation.deleteAlbums(target.constructionId, albumIds, canceller, (done, total) => {
            progressWindow.setProgress(done / total);
          });
        }
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
      } catch (e) {
        logger.error('ALBUM:REMOVE-EMPTIES', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        holder.release();
      }
    },
  },
  'ALBUM:CHANGE-LAYOUT': {
    async run(parent, target) {
      // Action for 「ページのレイアウトこのページのレイアウトを以降のページに適用」
      unimplemented();
    },
  },
  'ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN': { // Action for 「小黒板情報付き写真を振り分けて取り込む...」
    async run(parent, target) {
      let progressWindow;
      let constructionId = target.constructionId;
      let bookrackId = target.bookrackId;

      let holder = holdWindowsStop();
      try {

        let folder = await goyoDialog.showFolderSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, '',
          {}, false);
        if (folder === undefined) {
          return;
        }

        let nest = folder[0].split("\\");
        if (folder[0].endsWith(':\\')) {
          await goyoDialog.showWarningMessageDialog(parent,
            goyoAppDefaults.DIALOG_TITLE, `ドライブ直下は選択できません。\n選択したフォルダ(${folder[0]})`, "OK");
          return;
        }

        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => { canceller.cancel = true; });
        progressWindow.setProgress(0);

        let inputFiles = [];
        try {
          inputFiles = await directoryWalk(folder[0], goyoAppDefaults.SUPPORT_IMAGE_EXTENSIONS, goyoAppDefaults.MAX_RECURSIVE_DIRS);
          if (inputFiles.length === 0) {
            await goyoDialog.showWarningMessageDialog(parent,
              goyoAppDefaults.DIALOG_TITLE, `画像ファイルが見つかりませんでした。\n選択したフォルダ(${folder[0]})`, "OK");
            if (progressWindow) {
              await progressWindow.close();
            }
            return;
          }
        } catch (e) {
          logger.error('failed to directoryWalk', e);
          await goyoDialog.showWarningMessageDialog(parent,
            goyoAppDefaults.DIALOG_TITLE, `フォルダの読み込みに失敗しました。\n選択したフォルダ(${folder[0]})`, "OK");
          if (progressWindow) {
            await progressWindow.close();
          }
          return;
        }
        logger.debug(`inputFiles: ${inputFiles}`);

        let lockManager = null;
        let isLockAlbumItemdb = false;
        let lockAlbumIds = new Set();
        let error = null;
        try {
          // lock album
          lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
          isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
            .then(() => { return true })
            .catch((e) => {
              return false;
            });
          if (!isLockAlbumItemdb) {
            await goyoDialog.showConstructionLockBusyDialog(parent);
            return;
          }  
          let undistributedAlbumId;

          let bookrackItems = await bookrackAccessor.getBookrackItems(constructionId);
          let allAlbumIds = getAlbumIdsUnderBookrackItem(bookrackItems);
          let albumDetailPromises = allAlbumIds.map(id => {
            return bookrackAccessor.getAlbumDetail(constructionId, id).then(r => {
              r.albumDetail.tag =
                [
                  r.albumDetail.albumSettings.photoInfoTemplate.largeClassification,
                  r.albumDetail.albumSettings.photoInfoTemplate.photoClassification,
                  r.albumDetail.albumSettings.photoInfoTemplate.constructionType,
                  r.albumDetail.albumSettings.photoInfoTemplate.middleClassification,
                  r.albumDetail.albumSettings.photoInfoTemplate.smallClassification,
                ].join('\t');
              logger.debug(`tag: ${r.albumDetail.tag}`);
              return r.albumDetail;
            });
          });

          let newFrames = await goyoAlbumOperation.makeAlbumFrames(inputFiles, 'JacicXMP', null, (done, total) => {
            progressWindow.setProgress((done / total) * 0.2);
          });
          logger.debug(`newFrames.length: ${newFrames.length}`);

          let groups = makeGroupsByPhotoInformation(newFrames);
          let albumDetails = await Promise.all(albumDetailPromises);
          let addedCount = 0;

          let updateAlbumIds = new Set();
          for (let tag in groups) {
            let targetAlbumId;

            if (tag !== '\t\t\t\t') {
              let album = albumDetails.find(ad => ad.tag === tag);
              if (album) targetAlbumId = album.albumId;
            }
            if (!targetAlbumId) {
              if (!undistributedAlbumId) {
                let findResult = albumDetails.find(ad => ad.albumSettings.albumName === '振り分けできない写真');
                if (findResult) {
                  undistributedAlbumId = findResult.albumId
                } else {
                  let albumSettings = await goyoAlbumOperation.defaultAlbumSettings;
                  albumSettings.albumName = '振り分けできない写真';
                  let result = await goyoAlbumOperation.createAlbums(constructionId, bookrackId, null, 1, albumSettings);
                  undistributedAlbumId = result[0];
                  logger.debug(`jacic: create undistributed album albumId: ${undistributedAlbumId}`);
                }
              }
              targetAlbumId = undistributedAlbumId;
            }
            logger.debug(`jacic: targetAlbumId: ${targetAlbumId}`);

            if (!lockAlbumIds.has(targetAlbumId)) {
              if (await lockManager.lockAlbum(targetAlbumId, true)) {
                lockAlbumIds.add(targetAlbumId);
              }
            }

            let resultIds = await goyoAlbumOperation.replaceAndInsertFrames(
              constructionId,
              targetAlbumId,
              groups[tag],
              null,
              canceller, (done, total) => {
                progressWindow.setProgress(0.2 + 0.8 * ((done + addedCount) / newFrames.length));
              });

            addedCount += groups[tag].length;
            updateAlbumIds.add(targetAlbumId);
          }

          progressWindow.setProgress(1);
          await progressWindow.close();
          progressWindow = null;

          // Show illegal photos.
          //if (programSettings.imageDetermination.verifyWhileReading == 1) {
          //  let idPairs = resultIds.map(fid => { return { albumId: newAlbumIds[0], frameId: fid } });
          //  await goyoAlbumOperation.showIllegalFrames(constructionId, idPairs);
          //}
        } catch (e) {
          logger.error('ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN', e);
          error = e;
        } finally {
          if (lockManager != null) {
            lockAlbumIds.forEach((albumId) => {
              // release album lock
              lockManager.lockAlbum(albumId, false)
                .then(() => {})
                .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)});
            });
            if (isLockAlbumItemdb) {
              // release construction lock
              await lockManager.lockAlbumItemDatabase(false)
                .then(()=>{})
                .catch((e)=>{
                  logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
                });
            }
          }
          if (progressWindow) {
            await progressWindow.close();
          }
          if (error != null) {
            await goyoDialog.showErrorMessageDialog(
              parent, goyoAppDefaults.DIALOG_TITLE,
              'アルバム作成中にエラーが発生しました', 'OK');
          }
        }
      } catch(e) {
      } finally {
        holder.release();
      }
    },
  },

  'ALBUM:DELETE-BOOKMARKS': { // Action for 「しおりを全て捨てる」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        if (target.albumIds.length !== 1) return false;
        let bookmarks = await bookrackAccessor.getBookmarks(target.constructionId, target.albumIds[0]);
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'このアルバム中の全てのしおりを削除します。\nよろしいですか？',
          'はい(&Y)',
          'いいえ(&N)',
        );
        if(result && bookmarks.bookmarks.length > 0) {
          await goyoAlbumOperation.deleteBookmarks(target.constructionId, target.albumIds[0], bookmarks.bookmarks);
        }
      } catch (e) {
        logger.error('ALBUM:DELETE-BOOKMARKS', e);
      } finally {
        holder.release();
      }
    },
  },
  'ALBUM:DELETE-CONTENT': { // Action for 「アルバムの内容を削除」
    async run(parent, target) {
      unimplemented();
    },
  },

};

module.exports = actions;

function removeInContainer(container, childItemId) {
  container.bookrackItems.some((element, index, array) => {
    if (element.bookrackItemId === childItemId) {
      container.bookrackItems.splice(index, 1);
      return true;
    }
  });
}

// function for dynamic sorting ShootingDate
function compareValuesShootingDate(key, order = 'asc') {
  return function (a, b) {
    if (a[key] === '' && b[key] === '') {
      return 0;
    } else if (a[key] === '') {
      return 1;
    } else if (b[key] === '') {
      return -1;
    } else {
      let aTime = (new Date(a[key])).getTime();
      let bTime = (new Date(b[key])).getTime();

      let result = (aTime === bTime) ? 0 : (aTime > bTime) ? 1 : -1;

      return result * ((order === 'asc') ? 1 : -1);
    }
  };
}

// function for dynamic sorting
function compareValues(key, order = 'asc') {
  return function (a, b) {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
      return 0;
    }
    const varA = (typeof a[key] === 'string') ?
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ?
      b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (order === 'asc') {
      if (varA === "") {
        comparison = 1;
      } else if (varB === "") {
        comparison = -1;
      } else if (varA === varB) {
        comparison = 0;
      } else if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
    } else if (order === 'desc') {
      if (varA > varB) {
        comparison = -1;
      } else if (varA < varB) {
        comparison = 1;
      } else if (varA === varB) {
        comparison = 0;
      } else if (varA === "") {
        comparison = -1;
      } else if (varB === "") {
        comparison = 1;
      }
    }
    return comparison;
  };
}

function makeGroupsByPhotoInformation(albumFrames) {
  let groups = {};

  for (let frame of albumFrames) {
    let cpi = frame.constructionPhotoInformation;
    let tag = '\t\t\t\t';
    if (cpi && cpi.hasOwnProperty('写真情報')) {
      tag = [
        cpi['写真情報']['写真-大分類'] || '',
        cpi['写真情報']['写真区分'] || '',
        cpi['写真情報']['工種'] || '',
        cpi['写真情報']['種別'] || '',
        cpi['写真情報']['細別'] || '',
      ].join('\t');
    }

    if (!groups[tag]) {
      groups[tag] = [];
    }
    groups[tag].push(frame);
  }

  return groups;
}

function getAlbumsFromBookrack(bookrackItems, result) {
  if (!bookrackItems) {
    return result;
  }

  for (let item of bookrackItems) {
    if (item.bookrackItemType === 3) {
      result.push(item);
    } else {
      result = getAlbumsFromBookrack(item.bookrackItems, result);
    }
  }
  return result;
}

function convertBookrackItemsToArr(items) {
  let allItems = [];
  allItems.push(items);
  if (items.bookrackItems.length > 0) {
    for (let i of items.bookrackItems) {
      allItems = allItems.concat(convertBookrackItemsToArr(i));
    }
  }
  return allItems;
}
function findEmptyBoxAndTray(items, type) {
  let allItem = convertBookrackItemsToArr(items);
  let result = allItem.filter(i => i.bookrackItemType === type && i.bookrackItems.length === 0);
  return result;
}

async function clearEmptyBoxs (constructionId) {
  let items = (await bookrackAccessor.getBookrackItems(constructionId));
  let emptyBoxs = findEmptyBoxAndTray(items, 2);
  if (emptyBoxs.length > 0) {
    for (let i = 0; i < emptyBoxs.length; i++) {
      await settingsOperation.deleteEmptyContainer(constructionId, emptyBoxs[i].bookrackItemId, false);
    }
    return true;
  }
}
async function clearEmptyTrays (constructionId) {
  let items = (await bookrackAccessor.getBookrackItems(constructionId));
  let emptyTrays = findEmptyBoxAndTray(items, 1);
  if (emptyTrays.length >= 1) {
    for (let i = 0; i < emptyTrays.length; i++) {
      await settingsOperation.deleteEmptyContainer(constructionId, emptyTrays[i].bookrackItemId, false);
    }
    return true;
  }
}
async function clearEmptyBoxsAndTraysThenRefreshBookrack(constructionId){
  await clearEmptyBoxs(constructionId);
  await clearEmptyTrays(constructionId);
  settingsOperation.emit("changeBookrackItems");
}