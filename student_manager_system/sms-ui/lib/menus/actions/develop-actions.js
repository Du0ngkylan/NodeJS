'use strict';

// Node.js modules.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 3rd-party modules.
const filetype = require('file-type');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const { BookrackViewWindowSet } = require('../../goyo-window-controller');
const goyoDialog = require('../../goyo-dialog-utils');
const goyoAlbumLayout = require('../../layout/goyo-album-layout');
const { holdWindowsStop, directoryWalk } = require('../../goyo-utils');
const goyoAppDefaults = require('../../goyo-app-defaults');
const settingsOperation = require('../../goyo-settings-operation');
const goyoAlbumOperation = require('../../goyo-album-operation');
const logger = require('../../goyo-log')('develop-actions');
const MENU_TYPE = require('../goyo-menu-type');
const programSettings = require('../../goyo-program-settings');
const lockFactory = require('../../lock-manager/goyo-lock-manager');

const { appEnv } = require('../../goyo-app-env');


const actions = {
  'DEVELOP:OPEN-VERSION-INFORMATION': { // Action for 「バージョン情報...」
    runnableWhileSharedLock : true,    
    isRunnable() {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('DEVELOP:OPEN-VERSION-INFORMATION', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        const licenseManager = require('../../license/goyo-license-manager');
        const version = goyoAppDefaults.VERSION;
        await goyoDialog.showSimpleMessageDialog(
          parent,
          'バージョン情報',
          `製品名：\n　　${goyoAppDefaults.PRODUCT_NAME} ${licenseManager.licenseTypeName}\n\nバージョン：\n　　${version}`,
          'OK');
      } catch (e) {
        logger.error('DEVELOP:OPEN-VERSION-INFORMATION', e);
      } finally {
        holder.release();
      }
    },
  },
  'DEVELOP:DELETE-ALBUMS-FORCE': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('DEVELOP:DELETE-ALBUMS-FORCE', e);
        return false;
      }
    },
    async run(parent, target) {
      logger.debug('DEVELOP:DELETE-ALBUMS-FORCE');
      let progressWindow;

      let holder = holdWindowsStop();
      try {
        logger.debug('DEVELOP:DELETE-ALBUMS-FORCE');

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

        // show second dialog,   and break loop if user click cancel.
        const confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
          'データの削除', `選択された${targetAlbumIds.length}個のアルバムを削除します。`, 'はい(&Y)', 'いいえ(&N)');
        if (!confirm) {
          return;
        }

        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        // 2. delete procedure for each albums
        for (let albumId of targetAlbumIds) {
          let deletedAlbum = bookrackAccessor.findBookrackItem(albumId, bookrackItems);

          try {

            let allFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
            let frameIds = allFrames.map(f => f.albumFrameId);
            let deletedFrameIds = await goyoAlbumOperation.deleteFrames(constructionId, albumId, frameIds, null, canceller, (done, total) => {
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
            logger.error('DEVELOP:DELETE-ALBUMS-FORCE', e);
            await goyoDialog.showErrorMessageDialog(
              parent, goyoAppDefaults.DIALOG_TITLE, 'アルバムを削除できませんでした。', 'OK');
            return false;
          }
        }
      } catch (e) {
        logger.error('DEVELOP:DELETE-ALBUMS-FORCE', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        holder.release();
      }
    },
  },
  'DEVELOP:NEW-FROM-FILE-WITH-CONNECT': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('PHOTO:NEW-FROM-FILE-WITH-CONNECT', e);
        return false;
      }
    },
    async run(parent, target) {
      let progressWindow;
      let lockManager = null;
      let isLockAlbumItemdb = false;
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
        // lock albumItemdb (lock Construction)
        isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(()=>{return true})
        .catch((e)=>{
          return false;
        });
        if (!isLockAlbumItemdb) {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return;
        }

        let fileList = await goyoDialog.showOpenFileSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, undefined,
          goyoAppDefaults.inputFileFilter, true);

        if (!fileList) {
          return;
        }

        // show progress dialog.
        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        progressWindow.setProgress(0);

        // make album frames, sort them and ignore errors.
        let albumDetailResult = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
        let newFrames = await goyoAlbumOperation.makeAlbumFrames(fileList, 'KuraemonKokuban', albumDetailResult.albumDetail, (done, total) => {
          progressWindow.setProgress(done / (2 * fileList.length));
        });

        // insert new frame into the album.
        var resultIds = await goyoAlbumOperation.replaceAndInsertFrames(
          target.constructionId,
          target.albumIds[0],
          newFrames,
          (target.frameIds.length > 0) ? target.frameIds[0] : undefined,
          canceller, (done, total) => {
            progressWindow.setProgress((fileList.length + done) / (fileList.length + newFrames.length));
          });
        await progressWindow.close();
        progressWindow = null;

        await goyoDialog.showSimpleMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '写真の登録が完了しました。', 'OK');
      } catch (e) {
        logger.error('PHOTO:NEW-FROM-FILE', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        if (lockManager != null){
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => {})
            .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)});
          if (isLockAlbumItemdb) {
            // release construction lock
            await lockManager.lockAlbumItemDatabase(false)
            .then(()=>{})
            .catch((e)=>{
              logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
            });
          }
        }
        holder.release();
      }
    },
  },
  'DEVELOP:MAKE-ALBUMS': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('DEVELOP:MAKE-ALBUMS', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let parentBookrackItemId = null;
        let siblingItemId = null;

        // get default albumSettings
        let albumSettings = await goyoAlbumOperation.defaultAlbumSettings;

        let newSetting = await goyoDialog.showAlbumSettingDialog(parent, 'DEFAULT', albumSettings);
        if (!newSetting) {
          return false;
        }

        let blockCount = 6;
        if (newSetting.layout) {
          console.log(`newSetting: ${JSON.stringify(newSetting,null,2)}`);
          let layoutInfo = await goyoAlbumLayout.getLayoutInfo(newSetting.layout);
          let template = await layoutInfo.template;
          blockCount = template.leftPageBlockCount + template.rightPageBlockCount;
        }

        let folder = await goyoDialog.showFolderSelectionDialog(parent,
          '登録する画像を配置したフォルダを選択', '',
          {}, false);

        let fileList = [];
        if (folder) {
          try {
            fileList = await directoryWalk(folder[0], goyoAppDefaults.SUPPORT_IMAGE_EXTENSIONS, goyoAppDefaults.MAX_RECURSIVE_DIRS);
          } catch(e) {
            logger.error('failed to collectImageFiles', e);
          }
        }

        let newFrames = await goyoAlbumOperation.makeAlbumFrames(fileList, 'Album', newSetting);
        let frameBase = {
          base: newFrames,
          pos: 0,

          getFrames(count) {
            let result = [];
            for (let i=0; i<count; i++) {
              result.push(this.base[(this.pos++)%this.base.length]);
            }
            return result;
          },
        };

        // show progress window.
        let canceller = { cancel: false };
        let progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        try {
          for (let i=0; i<newSetting.initialAlbumNumber; i++) {
            let [albumId] = await goyoAlbumOperation.createAlbums(
              target.constructionId, target.bookrackId, null,
              1, newSetting, newSetting.layout, null, 'before');

            if (newFrames.length>0) {
              await goyoAlbumOperation.replaceAndInsertFrames(
                target.constructionId, albumId,
                frameBase.getFrames(Math.floor(newSetting.initialPageNumber*blockCount/2)), 1,
                canceller, (done,total) => {
                  progressWindow.setProgress(done/total);
                }
              );
            }
          }
        } catch(e) {
          logger.error('DEVELOP:MAKE-ALBUMS', e);
        } finally {
          if (progressWindow) {
            await progressWindow.close();
          }
        }
      } catch (e) {
        logger.error('ALBUM:NEW', e);
      } finally {
        holder.release();
      }
    },
  },
  'DEVELOP:MAKE-BOOKMARK-ALL': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('PHOTO:NEW-FROM-FILE-WITH-CONNECT', e);
        return false;
      }
    },
    async run(parent, target) {
      let constructionId = target.constructionId;

      for (let albumId of target.albumIds) {

        let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
        let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);

        let newBookmarks = albumFrames
          .filter(frame => bookmarks.every(bm => bm.albumFramePosition !== frame.displayNumber))
          .map(frame => {
            let name = (frame.photoFrames.length>0)
              ?  frame.photoFrames[0].fileArias
              : `空き(${frame.displayNumber})`;
            return {
              bookmarkId: 0,
              bookmarkName: name,
              bookmarkColor: 3,
              albumFramePosition: frame.displayNumber,
            };
          });

        await goyoAlbumOperation.addBookmarks(constructionId, albumId, newBookmarks);
      }
    },
  },
  'DEVELOP:ROTATE-ALL': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('DEVELOP:ROTATE-ALL', e);
        return false;
      }
    },
    async run(parent, target) {
      let constructionId = target.constructionId;
      let albumId = target.albumIds[0];

      let canceller = { cancel: false };
      let progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });
      try {
        let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);

        for (let frame of albumFrames) {
          if (frame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
            frame.textFrames['goyo.photo.rotate'].fieldValue = '90';
          } else {
            frame.textFrames['goyo.photo.rotate'] = makeTextFrameField('goyo.photo.rotate', '90');
          }
        }

        await goyoAlbumOperation.updateFrames(
          constructionId,
          albumId,
          albumFrames,
          canceller,
          (done,total) => progressWindow.setProgress(done/total)
        );
      } catch(e) {
        logger.error('DEVELOP:ROTATE-ALL', e);
      } finally {
        await progressWindow.close();
      }
    },
  },
  'DEVELOP:MAKE-RICHTEXT': {
    runnableWhileSharedLock : true,    
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

        let [ albumDetail ] = await target.albumDetails;
        const constructionId = target.constructionId;
        const albumId = target.albumIds[0];
        let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);
        if (target.frameIds.length > 0) {
          albumFrames = albumFrames.filter(f => target.frameIds.includes(f.albumFrameId));
        }

        let updated = albumFrames
          .filter(f => f.photoFrames.length > 0)
          .map(f => {
            let overwrite = false;
            Object.values(f.textFrames)
              .filter(tf => !tf.fieldKey.startsWith('kokuban.') && !tf.fieldKey.startsWith('visibility.') && !tf.fieldKey.startsWith('goyo.'))
              .filter(tf => tf.richText == null || tf.richText.ops == null)
              .forEach(tf => {
                tf.richText = {
                  ops: [ {
                    attributes: { bold: true, italic: true, strike: true, underline: true, color: "#ff8888" },
                    insert: tf.fieldValue
                  } ]
                };
                overwrite = true;
              });
            if (overwrite) return f;
            else return null;
          })
          .filter(f => f != null);
        /*
        for (let albumFrame of albumFrames) {
          if (albumFrame.photoFrames.length < 1) continue;
          for (let textFrame of albumFrame.textFrames) {
            if (!textFrame.key.startsWith('kokuban.') && !textFrame.key.startsWith('visibility.') && !textFrame.key.startsWith('goyo.')) {
              if (textFrame.richText == null || textFrame.richText.ops == null) {
                textFrame.richText = {
                  ops: {
                    attributes: { bold: true, italic: true, strike: true, underline: true, color: "#ff8888" },
                    insert: textFrame.fieldValue
                  }
                };
              }
            }
          }
        }
        */

        if (updated.length === 0) {
          return;
        }

        let canceller = {
          cancel: false
        };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        await goyoAlbumOperation.updateFrames(constructionId, albumId, updated, canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });
      } catch (e) {
        logger.error('DEVELOP:MAKE-RICHTEXT', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        if (lockManager != null){
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => {})
            .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)}); 
        }
        holder.release();
      }
    },
  },
};

function removeInContainer(container, childItemId) {
  container.bookrackItems.some((element, index, array) => {
    if (element.bookrackItemId === childItemId) {
      container.bookrackItems.splice(index, 1);
      return true;
    }
  });
}

function getAlbumIdsUnderContainer(bookrackItems, containerId) {
  let item = findBookrackItem(bookrackItems, containerId);
  if (item) {
    return getAlbumIdsUnderBookrackItem(item);
  } else {
    return [];
  }
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

function makeTextFrameField(key, value, label="") {
  return {
    fieldKey: key,
    fieldValue: value,
    fieldLabel: label,
    hideSentence: 0,
    hideSentenceBackground: 0,
    textFrameId: 0,
  };
}

module.exports = actions;

