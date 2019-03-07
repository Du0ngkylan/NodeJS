'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');

// Electron modules.
const { BrowserWindow, app } = require('electron');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const settingsOperation = require('../../goyo-settings-operation');
const programSettings = require('../../goyo-program-settings');
const goyoDialog = require('../../goyo-dialog-utils');
const licenseManager = require('../../license/goyo-license-manager');
const goyoAppDefaults = require('../../goyo-app-defaults');
const { shellopen, htmlOpener, holdWindowsStop } = require('../../goyo-utils');
const kuraemonConnect = require('../../connect-if/kuraemon-connect');
const logger = require('../../goyo-log')('special-actions');
const lockFactory = require('../../lock-manager/goyo-lock-manager');
const goyoAppFolder = require('../../goyo-appfolder');

// Internal functions.
function unimplemented() {
  logger.info('menu-actions: unimplemented action is executed');
}

function findParentBookrackItem(item, targetId) {
  if (!item.bookrackItems) return null;

  let result = item.bookrackItems.find(i => i.bookrackItemId === targetId);
  if (result) return item;

  for (let i of item.bookrackItems) {
    let result = findParentBookrackItem(i, targetId);
    if (result) return result;
  }
  return null;
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
  }
}
async function clearEmptyTrays (constructionId) {
  let items = (await bookrackAccessor.getBookrackItems(constructionId));
  let emptyTrays = findEmptyBoxAndTray(items, 1);
  if (emptyTrays.length > 1) {
    for (let i = 0; i < emptyTrays.length - 1; i++) {
      await settingsOperation.deleteEmptyContainer(constructionId, emptyTrays[i].bookrackItemId, false);
    }
  }
  if(emptyTrays.length == 1){
    await settingsOperation.deleteEmptyContainer(constructionId, emptyTrays[emptyTrays.length - 1].bookrackItemId, true);
  }
}

async function moveBookrackItemToOtherBookrack(targetBookrackItem, sourceItem, constructionId) {
  const displayNumber = [0];
  targetBookrackItem.bookrackItems.forEach(bookrack => {
    if (bookrack.displayNumber) {
      displayNumber.push(bookrack.displayNumber);
    }
  });
  sourceItem.parentBookrackItemId = targetBookrackItem.bookrackItemId;
  if (sourceItem.bookrackItemType === 3) {
    sourceItem.bookrackItemFolder = sourceItem.bookrackItemFolder.match(/album\d+$/g)[0];
  }
  return true;
}

async function moveAlbumToOtherConstruction(parent, otherConstructionId, target) {
  let lockManager = null;
  let otherLockManager = null;
  let failLockAlbum = false;
  // unlock function
  let unLockExclusiveConstructions = async (lManager)=> {
    if (lManager != null) {
      await lManager.lockAlbumItemDatabase(false)
      .then(()=>{})
      .catch((e)=>{
        logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
      });
    }
  };

  // lock exclusive constructions (album item db)
  try {
    lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
    await lockManager.lockAlbumItemDatabase(true);
    otherLockManager = await lockFactory.makeLockManagerByConstructionId(otherConstructionId);
    await otherLockManager.lockConstruction(true);
    await otherLockManager.lockAlbumItemDatabase(true);
  } catch (e) {
    logger.error('Failed to makeLockManagerByConstructionId', e);
    await unLockExclusiveConstructions(lockManager);
    await otherLockManager.finalize()
    .then(()=>{})
    .catch((e)=>{ logger.error('Failed to finalize', e); });
    await goyoDialog.showConstructionLockBusyDialog(parent);
    return;
  }

  try {
    let item = await bookrackAccessor.getBookrackItems(target.constructionId);
    let otherConstruction = await bookrackAccessor.getBookrackItems(otherConstructionId);
    if (otherConstruction.bookrackItems.length > 0) {
      let displayNumber = [0];
      otherConstruction.bookrackItems[0].bookrackItems.forEach(item => {
        if (item.hasOwnProperty('displayNumber')) {
          displayNumber.push(item.displayNumber);
        }
      });

      // Move tray
      if (target.compartmentId) {
        const { bookrackItems } = await bookrackAccessor.getBookrackItems(target.constructionId);
        const tray = bookrackAccessor.findBookrackItem(target.compartmentId, bookrackItems);
        const boxAlbumIds = [];
        const trayBookrackItems = tray.bookrackItems;
        for (let i = 0; i < trayBookrackItems.length; i++) {
          const bookrackItem = trayBookrackItems[i];
          if (bookrackItem.bookrackItemType === 3) {
            const { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, bookrackItem.bookrackItemId);
            const { albumId } = await moveAlbum(albumDetail);
            boxAlbumIds.push(albumId);
          } else {
            const boxId = await moveBox(bookrackAccessor.findBookrackItem(bookrackItem.bookrackItemId, trayBookrackItems));
            boxAlbumIds.push(boxId);
          }
        }

        await settingsOperation.createCompartmentFromSetting(tray, otherConstructionId, boxAlbumIds);
        return;
      }

      // Move boxes
      const albumBoxes = [];
      target.boxIds.forEach((boxId) => {
        albumBoxes.push(bookrackAccessor.findBookrackItem(boxId, item.bookrackItems));
      });
      while (albumBoxes.length > 0) {
        const albumBox = albumBoxes[0];
        await moveBox(albumBox);
        albumBoxes.shift();
      }

      // Move albums
      const albumDetails = await target.albumDetails;

      while (albumDetails.length > 0) {
        await moveAlbum(albumDetails[0]);
        albumDetails.shift();
        target.albumIds.shift();
      }

      async function moveBox(albumBox) {
        const albumDetails = [];
        for (let i = 0; i < albumBox.bookrackItems.length; i++) {
          const { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, albumBox.bookrackItems[i].bookrackItemId);
          albumDetails.push(albumDetail);
        }

        const albumIds = [];
        while (albumDetails.length > 0) {
          let result = await moveAlbum(albumDetails[0]);
          albumIds.push(result.albumId);
          albumDetails.shift();
        }

        const boxSetting = {
          bookrackItemName: albumBox.bookrackItemName,
          colorType: albumBox.colorType,
        };
        const result = await settingsOperation.createBoxFromSetting(boxSetting, otherConstructionId, albumIds);
        if (result) {
          const parentBookrackItem = findParentBookrackItem(item, albumBox.bookrackItemId);
          if (parentBookrackItem.bookrackItemType === 1) {
            if (parentBookrackItem.bookrackItems.length === 1) {
              logger.debug('Delete empty tray success !');
            } else {
              const boxIndex = parentBookrackItem.bookrackItems.findIndex((item) => item.bookrackItemId === albumBox.bookrackItemId);
              parentBookrackItem.bookrackItems.splice(boxIndex, 1);
            }
          }
        }
        return result;
      }

      async function moveAlbum(albumDetail) {
        let sourceAlbumId = 0;
        let newAlbumId = 0;
        try {
          const album = Object.assign({}, albumDetail);
          album.albumFrameTotalCount = 0;
          album.albumId = 0;
          album.parentBookrackItemId = otherConstruction.bookrackItems[0].bookrackItemId;
          album.displayNumber = Math.max(...displayNumber) + 1;
          displayNumber.push(album.displayNumber);
          
          // lock source album
          if (await lockManager.lockAlbum(albumDetail.albumId, true)) {
            sourceAlbumId = albumDetail.albumId;
          } else {
            failLockAlbum = true;
            throw new Error('lock busy');
          }

          let albumFrames = await bookrackAccessor.getAlbumFrames(target.constructionId, albumDetail.albumId);
          if (albumFrames) {
            let result = await bookrackAccessor.updateAlbum(otherConstructionId, album);
            if (result) {
              
              // lock new album
              if (await otherLockManager.lockAlbum(result.albumId, true)) {
                newAlbumId = result.albumId;
              } else {
                failLockAlbum = true;
                throw new Error('lock busy');
              }
    
              let existEmptyBox = findParentBookrackItem(item, albumDetail.albumId);
              let existEmptyTray = findParentBookrackItem(item, existEmptyBox.bookrackItemId);
              albumFrames.albumFrames.forEach(albumFrame => {
                albumFrame.photoFrames.forEach(photoFrame => {
                  photoFrame.albumItemId = 0;
                });
              });

              let response = {};
              const progressWindow = goyoDialog.showProgressDialog(parent);
              let internalProgress = (label, done, total, working) => {
                progressWindow.setProgress(done / (total * 2));
              };
              let progress = (done) => {
                progressWindow.setProgress((done / 2) + 0.5);
              };
          
              try {
                logger.trace("begin transaction");
                await bookrackAccessor.execTransactionAlbumItems(otherConstructionId, 'begin');
                await bookrackAccessor.execTransactionAlbum(otherConstructionId, newAlbumId, 'begin');
                response = await bookrackAccessor.addAlbumFrames(otherConstructionId, newAlbumId, albumFrames.albumFrames, internalProgress);
                await bookrackAccessor.execTransactionAlbumItems(otherConstructionId, 'commit');
                await bookrackAccessor.execTransactionAlbum(otherConstructionId, newAlbumId, 'commit');
                logger.trace("commit transaction");
              } catch (e) {
                logger.error('Failed to transaction or addAlbumFrames', e);
                await progressWindow.close();
                await bookrackAccessor.execTransactionAlbumItems(otherConstructionId, 'rollback');
                await bookrackAccessor.execTransactionAlbum(otherConstructionId, newAlbumId, 'rollback');
                throw e;
              // } finally {
              //   await progressWindow.close();
              }
              return result;
            }
          }  
        } catch(e) {
          throw e;
        } finally {
          if (sourceAlbumId !== 0) {
            await lockManager.lockAlbum(sourceAlbumId, false);
          }
          if (newAlbumId !== 0) {
            await otherLockManager.lockAlbum(newAlbumId, false);
          }
        }
      }

    } else {}

  } finally {
    await unLockExclusiveConstructions(lockManager);
    await unLockExclusiveConstructions(otherLockManager);
    if (otherLockManager != null) {
      await otherLockManager.finalize()
      .then(()=>{})
      .catch((e)=>{ logger.error('Failed to finalize', e); });
    }
    if (failLockAlbum === true) {
      await goyoDialog.showAlbumLockBusyDialog(parent);
    }
  }
}


async function startUpdate(parent, isSkipGetUpdateMassage = false) {
  const goyoRegistry = require('../../license/goyo-registry-accessor');
  const fse = require('fs-extra');
  let goyoUpdate = require('../../goyo-update');
  let checkUpdate = await goyoUpdate.checking();

  if (!checkUpdate || checkUpdate.code == null) {
    await goyoDialog.showErrorMessageDialog(
      parent,
      goyoAppDefaults.DIALOG_TITLE,
      'アップデートをダウンロードできませんでした。\nセキュリティソフトやネットワークの設定によりブロックされている可能性があります。\nウェブページから最新版のソフトをダウンロードし、上書きインストールをお試しください。',
      'OK');
    htmlOpener.openDownload();
    return;
  }

  if (checkUpdate.code == 200) {
    await goyoDialog.showSimpleMessageDialog(
      parent, goyoAppDefaults.DIALOG_TITLE,
      '現在使用しているバージョンは、最新バージョンです\nアップデートの必要はありません。',
      'OK');
    return;
  } else if (checkUpdate.code != 201) {
    await goyoDialog.showErrorMessageDialog(parent,
      goyoAppDefaults.DIALOG_TITLE,
      'アップデートをダウンロードできませんでした。\nセキュリティソフトやネットワークの設定によりブロックされている可能性があります。\nウェブページから最新版のソフトをダウンロードし、上書きインストールをお試しください。',
      'OK');
    htmlOpener.openDownload();
    return;
  }

  try {
    let answer = false;
    if ( !isSkipGetUpdateMassage ) {
      answer = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
        goyoAppDefaults.DIALOG_TITLE,
        "御用達のアップデートが見つかりました。\nアップデートしますか？",
        "はい(&Y)", "いいえ(&N)");
      if (!answer) { return; }  
    }

    let installerPath = await goyoUpdate.download(parent, checkUpdate.update.url);
    if (!installerPath) { return; }

    answer = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
      goyoAppDefaults.DIALOG_TITLE,
      "アップデートを実行します",
      "はい(&Y)", "いいえ(&N)");
    if (!answer) { return; }

    {
      let goyoExeFolder = await goyoRegistry.loadInstallPath();
      logger.info(`do update for '${installerPath}'`);
      const BATCH_PATH = path.join(goyoAppFolder.getAppFolder(),'update.bat');
      const BATCH_CONTENT = `
        cd /D "${path.dirname(installerPath)}"
        start /wait ${path.basename(installerPath)} /SILENT
        REM IF NOT ERRORLEVEL 1 (
          cd /D "${goyoExeFolder}"
          start GOYO.exe --updatefrom=${goyoAppDefaults.VERSION}
        REM )
        del "${BATCH_PATH}"
      `;
      await fse.writeFile(BATCH_PATH, BATCH_CONTENT);
      const { spawn } = require('child_process');
      const bat = spawn('cmd.exe', ['/c', BATCH_PATH], {detached: true, stdio: 'ignore'});
      setTimeout(() => {
        if (viewMode.mainWindowHandle) {
          viewMode.closeCurrentModeWindow();
        } else {
          app.quit();
        }
      }, 500);
    }
  } catch(e) {
    logger.error('goyoUpdate.download', e);
    await goyoDialog.showErrorMessageDialog(parent,
      goyoAppDefaults.DIALOG_TITLE,
      'アップデートをダウンロードできませんでした。\nセキュリティソフトやネットワークの設定によりブロックされている可能性があります。\nウェブページから最新版のソフトをダウンロードし、上書きインストールをお試しください。',
      'OK');
    htmlOpener.openDownload();
  }
}


const actions = {
  ///////////////////////////////////////////////////////////////////
  // Special
  ///////////////////////////////////////////////////////////////////
  'SPECIAL:SHOW-CONSTRUCTION-LIST': { // Action for 「工事の選択と管理...」
    runnableWhileSharedLock : true,
    async run(parent, target) {
      viewMode.setNextMode(viewMode.MODE_CONSTRUCTION_SELECTION, {
        selectionMode: 'normal',
        defaultConstructionId: target.constructionId
      });
      viewMode.closeCurrentModeWindow();
    },
  },
  'SPECIAL:SHOW-BOOKRACK-LIST': { // Action for 「本棚の選択と管理...」
    runnableWhileSharedLock : true,
    async run(parent, target) {
      viewMode.setNextMode(viewMode.MODE_BOOKRACK_LIST, {constructionId: target.constructionId, defaultBookrackId: target.bookrackId});
      viewMode.closeCurrentModeWindow();
    },
  },
  'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK': {
    async run(parent, target) {
      // Action for 「アルバムを別の本棚に移動...」
      let holder = holdWindowsStop();
      try {
        const constructionId = target.constructionId;
        const allBookrackItems = (await bookrackAccessor.getBookrackItems(constructionId)).bookrackItems;
        const originBookrackId = target.bookrackId;
        if (target.compartmentId) {
          target = [bookrackAccessor.findBookrackItem(target.compartmentId, allBookrackItems)];
        } else {
          const albumBoxIds = [...target.albumIds, ...target.boxIds];
          target = albumBoxIds.reduce((arr, bookrackItemId) => {
            arr.push(bookrackAccessor.findBookrackItem(bookrackItemId, allBookrackItems));
            return arr;
          }, []);
        }
        let listOtherBookrack = [];
        for (let i = 0; i < allBookrackItems.length; i++) {
          let bookrackItemId = allBookrackItems[i].bookrackItemId;
          if (bookrackItemId !== originBookrackId) {
            let displayNumber = allBookrackItems[i].displayNumber;
            let bookrackItemName = allBookrackItems[i].bookrackItemName;
            listOtherBookrack.push({
              itemId: bookrackItemId,
              number: displayNumber,
              name: bookrackItemName
            });
          }
        }
        listOtherBookrack.sort((album1, album2) => album1.number - album2.number);
        let initialParam = {};
        initialParam.title = '本棚の選択';
        initialParam.message = '選択したアルバムを移動する本棚を指定してください。';
        initialParam.list = listOtherBookrack;
        let result = await goyoDialog.showAlbumMoveDialog(parent, initialParam);
        if (result) {
          // implement move album to other bookrack
          const targetBookrack = await bookrackAccessor.findBookrackItem(result, allBookrackItems);
          for (let i = 0; i < target.length; i++) {
            const movingBookrackItem = target[i];
            await moveBookrackItemToOtherBookrack(targetBookrack, movingBookrackItem, constructionId);
          }
          await clearEmptyBoxs(constructionId);
          await clearEmptyTrays(constructionId);
          settingsOperation.emit('changeBookrackItems');
        }
      } catch(e) {
        logger.error('SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:MOVE-ALBUM-TO-OTHER-CONSTRUCTION': { // Action for 「アルバムを別の工事（本棚）に移動...」
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let listOtherConstruction = [];
        let constructions = await bookrackAccessor.getConstructions();
        for (let i = 0; i < constructions.constructions.length; i++) {
          let constructionId = constructions.constructions[i].constructionId;
          let displayNumber = constructions.constructions[i].displayNumber;
          let constructionName = constructions.constructions[i].constructionName;
          if (constructionId !== target.constructionId) {
            listOtherConstruction.push({ itemId: constructionId, number : displayNumber, name: constructionName });
          }
        }
        listOtherConstruction.sort((c1, c2) => c1.displayNumber - c2.displayNumber);
        let initialParam = {};
        initialParam.title = '工事の選択';
        initialParam.message = '選択したアルバムを移動する工事を指定してください。';
        initialParam.list = listOtherConstruction;
        let result = await goyoDialog.showAlbumMoveDialog(parent, initialParam);
        if (result) {
          // implement move album to other construction
          await moveAlbumToOtherConstruction(parent, result, target);
          await clearEmptyBoxs(target.constructionId);
          await clearEmptyTrays(target.constructionId);
        }
      } catch(e) {
        logger.error('SPECIAL:MOVE-ALBUM-TO-OTHER-CONSTRUCTION', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:OPEN-OTHER-PHOTO-MANGER': {
    async run(parent, target) {
      // Action for 「画像管理プログラム...」
      unimplemented();
    },
  },
  'SPECIAL:EDIT-PROHIBIT-RULES': {
    runnableWhileSharedLock : true,
    async run(parent, target) {
      // Action for 「禁則文字の自動変換ルール...」
      let holder = holdWindowsStop();
      try {
        await goyoDialog.showProhibitCharacterTranslateRuleDialog(parent);
      } catch (e) {
        logger.error('SPECIAL:EDIT-PROHIBIT-RULES', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:OPEN-OFFICIAL-SITE': {
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // Action for 「工事写真どっとこむ」
      htmlOpener.openGoyotashiSite();
    },
  },
  'SPECIAL:UPDATE-APPLICATION': {
    runnableWhileSharedLock : true,
    async run(parent, target) {
      // Action for 「御用達アップデート」
      let holder = holdWindowsStop();
      try {
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          goyoAppDefaults.DIALOG_TITLE,
          '御用達のアップデートがあるかどうかをインターネット経由で問い合わせます。\nよろしいですか？',
          'はい(&Y)', 'いいえ(&N)', false);
        if (!result) { return; }

        await startUpdate(parent);
      } catch (e) {
        logger.error('SPECIAL:UPDATE-APPLICATION', e);
        await goyoDialog.showErrorMessageDialog(parent,
          goyoAppDefaults.DIALOG_TITLE,
          'アップデート情報を取得できませんでした。',
          'OK');
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:UPDATE-APPLICATION-FROM-INFO': {
    runnableWhileSharedLock : true,
    async run(parent, targe) {
      // Action from update info
      let holder = holdWindowsStop();
      try {
        await startUpdate(parent);
      } catch (e) {
        logger.error('SPECIAL:UPDATE-APPLICATION-FROM-INFO', e);
        await goyoDialog.showErrorMessageDialog(parent,
          goyoAppDefaults.DIALOG_TITLE,
          'アップデート情報を取得できませんでした。',
          'OK');
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:UPDATE-APPLICATION-FROM-INFO-SKIP-MESSAGE': {
    runnableWhileSharedLock : true,
    async run(parent, targe) {
      // Action from update info
      let holder = holdWindowsStop();
      try {
        await startUpdate(parent, true);
      } catch (e) {
        logger.error('SPECIAL:UPDATE-APPLICATION-FROM-INFO', e);
        await goyoDialog.showErrorMessageDialog(parent,
          goyoAppDefaults.DIALOG_TITLE,
          'アップデート情報を取得できませんでした。',
          'OK');
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:OPEN-SUPPORT-SITE': { // Action for 「御用達サポート」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      htmlOpener.openSupportSite();
    },
  },
  'SPECIAL:OPEN-SORTOUT-TOOL': { // Action for 「写真整理ツール...」
    runnableWhileSharedLock : true,
    async run(parent, target) {
      let win = BookrackViewWindowSet.get(target.constructionId);
      win.openPhotoSortoutTool();
    },
  },
  'SPECIAL:OPEN-COPYRIGHT-NOTICE': { // Action for 「著作権について...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let message =
          'プログラムの著作権：\n' +
          `　${goyoAppDefaults.PRODUCT_NAME} ${licenseManager.licenseTypeName}\n` +
          '　　Copyright(c) 1996-2020 LECRE Inc. All rights reserved.\n\n' +
          'この製品は、日本国著作権法および著作権に関する国際条約によって保護されています。\n';

        await goyoDialog.showSimpleMessageDialog(parent, '著作権情報', message, 'OK');
      } catch (e) {
        logger.error('SPECIAL:OPEN-COPYRIGHT-NOTICE', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:CHANGE-TO-TREEVIEW': { // Action for 「ツリービューに切り替え」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      viewMode.setNextMode(viewMode.MODE_TREE_VIEW, { constructionId: target.constructionId, bookrackItemId: target.bookrackId });
      viewMode.closeCurrentModeWindow();
    },
  },
  'SPECIAL:OPEN-ENVIRONMENT-INFORMATION': { // Action for 「動作環境を確認...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let bootGoyo = false;
        let appData = goyoAppFolder.getAppDataFolder();
        await require('goyo-ui-env').open(
          null,
          goyoAppDefaults.PRODUCT_NAME,
          goyoAppDefaults.VERSION,
          {
            name: licenseManager.licenseTypeName,
            key: licenseManager.licenseKey,
            pcid: licenseManager.deviceId,
            appdata: appData,
          },
          (licenseManager.licenseType==='standard') ? showLicenseWindow : null,
          true,
        );

        if (bootGoyo) {
          viewMode.setNextMode(viewMode.MODE_CONSTRUCTION_SELECTION, {
            selectionMode: 'normal',
            defaultConstructionId: target.constructionId
          });
          viewMode.closeCurrentModeWindow();
        }

        async function showLicenseWindow(parent) {
          let wins = BrowserWindow.getAllWindows()
            .filter(win => win.isVisible());
          wins.forEach(win => win.hide());

          try {
            if (await licenseManager.registerLicense(parent)) {
              bootGoyo = true;
              return true;
            }
          } catch(e) {
            logger.error('showLicenseWindow', e);
          }
          wins.forEach(win => win.showInactive());
          return false;
        }
      } catch (e) {
        logger.error('SPECIAL:OPEN-ENVIRONMENT-INFORMATION', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:EDIT-PROGRAM-SETTING': { // Action for 「プログラム全体の設定...」
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let result = await programSettings.showEditDialog(parent);
      } catch (e) {
        logger.error('SPECIAL:EDIT-PROGRAM-SETTING: ', e);
      } finally {
        holder.release();
      }
    },
  },
  'SPECIAL:QUIT-PROGRAM': { // Action for 「プログラムを終了」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      viewMode.setNextMode(null);
      viewMode.closeCurrentModeWindow();
    },
  },
  'SPECIAL:CLOSE-WINDOW': { // Action for 「閉じる」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      parent.close();
    },
  },
  'SPECIAL:OPEN-MANUAL': { // Action for 「マニュアルを表示」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      htmlOpener.openManual();
    },
  },
  'SPECIAL:IMPORT-PHOTOS-FROM-KURAEMON-CONNECT': { // Action for 「蔵衛門コネクトから取り込み...」
    async run(parent, target) {
      assert(target.constructionId !== null);
      kuraemonConnect.isRunnable().then(async r => {
        if (r) {
          // check other shared lock Construction
          if (await checkSharedLock(target.constructionId)) {
            await goyoDialog.showConstructionShareLockBusyDialog(parent);
            return;
          }
          let promise = kuraemonConnect.run(target.constructionId);
          promise.then(
            async (result) => {
              if (result) {
                parent.close();
              } else {
                await goyoDialog.showErrorMessageDialog(parent, 'エラー',
                  `蔵衛門コネクトを起動できません。\n蔵衛門コネクトを再インストールするか、${goyoAppDefaults.GOYO_SUPPORT_NAME}（${goyoAppDefaults.GOYO_SUPPORT_PHONE_NUMBER}）まで${goyoAppDefaults.GOYO_SUPPORT_CONTACT_ACTION}`, 'OK');
                htmlOpener.openConnectSite();
              }
            }
          ).catch((e) => { });
        }else{
          // コネクトが起動できない状態
          await goyoDialog.showErrorMessageDialog(parent, 'エラー',
                  `蔵衛門コネクトがインストールされていません。\n蔵衛門.comからインストールしてください。（無料）`, 'OK');
          htmlOpener.openConnectSite();
        }
      });
    },
  },
  'SPECIAL:EXPORT-VIEWER': { // Action for 「ビューワ出力」
    runnableWhileSharedLock : true,    
    async isRunnable() {
      return false;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        if (licenseManager.licenseType === 'trial') {
          await goyoDialog.showLicenseRestrictionDialog(parent, 4);
        } else {
          await goyoDialog.showSimpleMessageDialog(
            parent,
            'ビューワ出力',
            '近日アップデート予定です。',
            'OK');
        }
      } catch(e) {
        logger.error('', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;
