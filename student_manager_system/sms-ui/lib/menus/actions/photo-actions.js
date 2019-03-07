'use strict';

// Node.js modules.
const assert = require('assert');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const os = require('os');
const cp = require('child_process');

// 3rd-party modules.
const filetype = require('file-type');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const goyoDialog = require('../../goyo-dialog-utils');
const goyoAppDefaults = require('../../goyo-app-defaults');
const { directoryWalk, holdWindowsStop, waitEffect, imgOrienToAddExif } = require('../../goyo-utils');
const goyoAlbumOperation = require('../../goyo-album-operation');
const goyoInteractive = require('../../goyo-interactive-album-view');
const logger = require('../../goyo-log')('photo-actions');
const MENU_TYPE = require('../goyo-menu-type');
const AlbumWindowSet = require('../../window-controller/album-windowset');
const programSettings = require('../../goyo-program-settings');
const lockFactory = require('../../lock-manager/goyo-lock-manager');
// const photoMetaDataAccessor = require('photo-metadata-accessor');
const goyoTemporal = require('../../goyo-temporal');
const { isTiffAlbumFrame } = require('./action-common');
const EDIT_SAVE_FRAME = '0';
const EDIT_SAVE_ADD_FRAME = '1';
const EDIT_SAVE_PICTURE_FILE = '2';

var saveRatio = {
  ratio: true,
  setRatio: function (checkRatio) {
    this.ratio = checkRatio;
  },
  getRatio: function () {
    return this.ratio;
  }
}

// Internal functions.
function unimplemented() {
  logger.info('menu-actions: unimplemented action is executed');
}

async function resizeImage(src, dest, width, height, ratio) {
  await bookrackAccessor.resizeImage(src, dest, width, height, ratio);
}

async function exportFiles(parent, target, getAlbumFrames) {
  let lockManager = null;
  let lastFile = '';
  let lastPosition = 0;

  try {
    // lock album
    lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
    let locked = await lockManager.lockAlbum(target.albumIds[0], true);
    if (!locked) {
      await goyoDialog.showAlbumLockBusyDialog(parent);
      return;
    }  

    let albumDetail = (await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0])).albumDetail;
    let imageCount = albumDetail.dataFolderInformation.imageFileTotalCount;

    if (imageCount === 0) {
      await goyoDialog.showErrorMessageDialog(parent,
        "エラー", "このアルバムには利用できる画像が1枚もありません。",
        "はい(&Y)");
      return;
    }

    let saveFolder = await goyoDialog.showFolderSelectionDialog(parent,
      goyoAppDefaults.DIALOG_SAVE_FOLDER_TITLE, '',
      {}, false);

    if (saveFolder === undefined) {
      return;
    }

    let folder = saveFolder[0];
    let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
      "質問", "保存先として" + folder +
      "が選択されました。\n保存を実行してよろしいですか？",
      "はい(&Y)", "いいえ(&N)", true);

    if (!result) {
      return;
    }

    let skipConfirm = false;
    let albumFrames = await getAlbumFrames(target);
    for (let albumFrame of albumFrames) {
      lastPosition++;
      if (albumFrame.photoFrames.length === 0) {
        continue;
      }
      const imageFile = albumFrame.photoFrames[0].imageFile;

      var extension = path.extname(imageFile);
      if (fs.existsSync(imageFile) && extension !== '.TPI') {
        let fileName = path.basename(albumFrame.photoFrames[0].fileArias, extension);

        let outFileName = folder + '\\' + fileName + extension;
        let saveName = outFileName;

        for (let i = 0; fs.existsSync(saveName); i++) {
          saveName = folder + '\\' + fileName + i + extension;
        }

        if (outFileName !== saveName && skipConfirm == false) {
          await goyoDialog.showSimpleMessageDialog(parent,
            "情報", outFileName + "は" + saveName +
            "として保存されます。",
            "OK");

          let skip = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
            "質問", "今後、このメッセージを表示しますか。\n" +
            "「いいえ」を選択した場合、同名のファイルが存在する場合は自動的に\nユニークなファイル名で保存します。",
            "はい(&Y)", "いいえ(&N)", true);
          if (!skip) {
            skipConfirm = true;
          }
        }
        lastFile = saveName;
        fs.copyFileSync(imageFile, saveName);
      }
    }

    await goyoDialog.showSimpleMessageDialog(parent,
      "情報", "アルバム内の画像を一括保存しました。",
      "OK");

  } catch (e) {
    await goyoDialog.showErrorMessageDialog(parent,
      "エラー", `ファイル名が長すぎる写真があります。(${lastPosition}枚目)\n ${lastFile}`,
      "はい(&Y)");
  } finally {
    if (lockManager != null){
      // release album lock
      lockManager.lockAlbum(target.albumIds[0], false)
        .then(() => {})
        .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)}); 
    }
  }
}

const actions = {
  ///////////////////////////////////////////////////////////////////
  // Photo
  ///////////////////////////////////////////////////////////////////
  'PHOTO:DELETE': { // Action for 「画像を削除」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      return target.frameIds.length > 0;
    },
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let waitCursor;
      try {
        // lock albumItemdb (lock Construction)
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(()=>{return true})
        .catch((e)=>{
          return false;
        });
        if (!isLockAlbumItemdb) {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return;
        }
        let dialogResult = await goyoDialog.showDeleteConfirmDialog(parent, {
          title: 'データの削除',
          message: `${target.frameIds.length}枚の画像を削除します。<br>`,
          information: 'この操作によって画像に付属する参考図、文章も削除されます。',
          question: '削除を実行しますか？',
          type: 4,
          hasCancel: true,
          okTitle: '削除'
        });
        waitCursor = waitEffect(parent);
        if (dialogResult) {
          await goyoAlbumOperation.deleteFrames(target.constructionId, target.albumIds[0], target.frameIds);
        }
      } catch (e) {
        logger.error('PHOTO:DELETE', e);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
        if (lockManager != null && isLockAlbumItemdb) {
          // release construction lock
          await lockManager.lockAlbumItemDatabase(false)
          .then(()=>{})
          .catch((e)=>{
            logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
          });
        }
      }
    },
  },
  'PHOTO:REMAKE-THUMBNAIL': { // Action for 「縮小画像を作り直す」
    async run(parent, target) {
      unimplemented();
    },
  },
  'PHOTO:SET-AS-SPINE-IMAGE': { // Action for 「背表紙の縮小画像に設定」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      try {
        if (target.frameIds.length === 1) {
          let { albumFrame } = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
          let { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
          albumDetail.albumSettings.bookCoverOption.reducedImagePosition = albumFrame.displayNumber;

          await goyoAlbumOperation.updateAlbumSetting(target.constructionId, target.albumIds[0], albumDetail.albumSettings, albumDetail.layout.albumTemplate, 'SPINE-IMAGE');
        }
      } catch (e) {
        logger.error('PHOTO:SET-AS-SPINE-IMAGE', e);
      }
    },
  },
  'PHOTO:SET-AS-FRONTCOVER-IMAGE': { // Action for 「表紙の画像に設定」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      try {
        if (target.frameIds.length === 1) {
          let { albumFrame } = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
          let { albumDetail } = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
          albumDetail.albumSettings.bookCoverOption.frontImagePosition = albumFrame.displayNumber;

          await goyoAlbumOperation.updateAlbumSetting(target.constructionId, target.albumIds[0], albumDetail.albumSettings, albumDetail.layout.albumTemplate);
        }
      } catch (e) {
        logger.error('PHOTO:SET-AS-FRONTCOVER-IMAGE', e);
      }
    },
  },
  'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN': { // Action for 「小黒板情報付き写真を追加...」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let promise = null;
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

        // Show dialog.
        let folder = await goyoDialog.showFolderSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, '',
          {}, false);
        if (folder === undefined) {
          return;
        }
        // Get all image files under the selected folder recursively.
        let fileList = await directoryWalk(folder[0], goyoAppDefaults.SUPPORT_IMAGE_EXTENSIONS, goyoAppDefaults.MAX_RECURSIVE_DIRS);
        if (fileList.length === 0) {
          return;
        }

        let result = await goyoAlbumOperation.replaceAndInsertFramesWithProgress(
          parent,
          target.constructionId,
          target.albumIds[0],
          fileList,
          'JacicXMP',
          (target.frameIds.length > 0) ? target.frameIds[0] : undefined,
          false
        );
      } catch (e) {
        logger.error('PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN', e);
      } finally {
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
        if (promise != null) {
          await promise;
        }
        holder.release();
      }
    },
  },
  'PHOTO:NEW-FROM-FILE': { // Action for 「ファイルを指定して追加...」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let promise = null;
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

        let fileList = await goyoDialog.showOpenFileSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, undefined,
          goyoAppDefaults.inputFileFilter, true);

        if (!fileList) {
          return;
        }
        if (fileList.length >= goyoAppDefaults.MAX_ADD_PHOTO_FILES) {
          await goyoDialog.showErrorMessageDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            `${goyoAppDefaults.MAX_ADD_PHOTO_FILES}枚以上の選択はできません。`,
            'OK');
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
        let result = await goyoAlbumOperation.replaceAndInsertFramesWithProgress(
          parent,
          target.constructionId,
          target.albumIds[0],
          fileList,
          'Album',
          (target.frameIds.length > 0) ? target.frameIds[0] : undefined,
          false
        );
      } catch (e) {
        logger.error('PHOTO:NEW-FROM-FILE', e);
      } finally {
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
        if (promise != null) {
          await promise;
        }
        holder.release();
      }
    },
  },
  'PHOTO:NEW-FROM-FOLDER': { // Action for 「フォルダを指定して追加...」
    runnableWhileSharedLock: true,
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let promise = null;
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

        // Show dialog.
        let folder = await goyoDialog.showFolderSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, '',
          {}, false);
        if (folder === undefined) {
          return;
        }
        // Get all image files under the selected folder recursively.
        let fileList = await directoryWalk(folder[0], goyoAppDefaults.SUPPORT_IMAGE_EXTENSIONS, goyoAppDefaults.MAX_RECURSIVE_DIRS);
        if (fileList.length === 0) {
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
        let result = await goyoAlbumOperation.replaceAndInsertFramesWithProgress(
          parent,
          target.constructionId,
          target.albumIds[0],
          fileList,
          'Album',
          (target.frameIds.length > 0) ? target.frameIds[0] : undefined,
          false
        );
      } catch (e) {
        logger.error('PHOTO:NEW-FROM-FOLDER', e);
      } finally {
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
        if (promise != null) {
          await promise;
        }
        holder.release();
      }
    },
  },
  'PHOTO:NEW-FROM-PLAIN': {
    async isRunnable(type, target) {
      return false;
    },
    async run(parent, target) {
      // Action for 「プレーン画像を追加...」
      assert(target.constructionId !== undefined);
      assert(Array.isArray(target.albumIds) && target.albumIds.length == 1);
      try {
        await goyoAlbumOperation.addPlainImage(
          parent, target.constructionId, target.albumIds[0], target.frameIds);
      } catch (e) {
        console.log('error', e);
        throw e;
      } finally {
      }
    },
  },
  'PHOTO:EXPORT-ALL-IN-ALBUM': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「アルバム内の画像を一括保存...」
      assert(target.constructionId !== undefined);
      assert(Array.isArray(target.albumIds) && target.albumIds.length == 1);

      let holder = holdWindowsStop();
      try {
        let getAlbumFrames = async function (target) {
          let constructionId = target.constructionId;
          let albumId = target.albumIds[0];
          let albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
          return albumFrames;
        }

        await exportFiles(parent, target, getAlbumFrames);
      } catch(e) {
        logger.error('PHOTO:EXPORT-ALL-IN-ALBUM', e);
      } finally {
        holder.release();
      }
    },
  },
  'PHOTO:EXPORT': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      if (type === MENU_TYPE.PHOTOVIEW) {
        return true;
      }
      let [{ albumFrame }] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      return true;
    },
    async run(parent, target) {
      // Action for 「画像を別名で保存...」
      assert(target.constructionId !== undefined);
      assert(Array.isArray(target.albumIds) && target.albumIds.length == 1);
      assert(Array.isArray(target.frameIds) && target.frameIds.length == 1);
      let holder = holdWindowsStop();
      try {
        let constructionId = target.constructionId;
        let albumId = target.albumIds[0];
        let frameId = target.frameIds[0];
        let albumFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)).albumFrame;

        const imageFile = albumFrame.photoFrames[0].imageFile;
        const file = fs.readFileSync(imageFile);
        let type = filetype(file);

        let outputFileFilter = goyoAppDefaults.outputFileFilter.find(f => f.extensions[0] === type.ext);

        let saveFile = await goyoDialog.showSaveFileSelectionDialog(parent,
          goyoAppDefaults.DIALOG_SAVE_OTHER_TITLE, '',
          [outputFileFilter]);

        if (saveFile === undefined) {
          logger.debug(`cancel saveFile=${saveFile}`);
          return;
        }

        if (!saveFile.toLowerCase().endsWith(type.ext)) {
          // force original extension
          saveFile = saveFile + '.' + type.ext;
        }
        fs.copyFileSync(imageFile, saveFile);

      } catch (e) {
        logger.error('PHOTO:EXPORT', e);
      } finally {
        holder.release();
      }
    },
  },
  'PHOTO:EXRPOT-SELECTED': {
    runnableWhileSharedLock: true,
    async isRunnable(type, target, options) {
      return Array.isArray(target.frameIds) && target.frameIds.length > 1;
    },
    async run(parent, target) {
      // Action for 「選択画像を一括保存...」
      assert(target.constructionId !== undefined);
      assert(Array.isArray(target.albumIds) && target.albumIds.length == 1);
      assert(Array.isArray(target.frameIds) && target.frameIds.length > 1);

      let holder = holdWindowsStop();
      try {
        let getAlbumFrames = async function (target) {
          let constructionId = target.constructionId;
          let albumId = target.albumIds[0];
          let albumFrames = [];
          for (let frameId of target.frameIds) {
            let albumFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)).albumFrame;
            albumFrames.push(albumFrame);
          }
          return albumFrames;
        }

        await exportFiles(parent, target, getAlbumFrames);
      } catch(e) {
        logger.error('PHOTO:EXPORT-SELECTED', e);
      } finally {
        holder.release();
      }
    },
  },

  ///////////////////////////////////////////////////////////////////
  // Photo view
  ///////////////////////////////////////////////////////////////////
  'PHOTOVIEW:CHANGE-TO-NORMAL': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「表示の切り替え通常のウィンドウ」
      unimplemented();
    },
  },
  'PHOTOVIEW:CHANGE-TO-FRAMELESS': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「表示の切り替え画像だけ表示」
      unimplemented();
    },
  },
  'PHOTOVIEW:CHANGE-TO-FULL(AUTOSCALING)': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「表示の切り替え全画面に表示サイズを自動調整して影を付ける」
      unimplemented();
    },
  },
  'PHOTOVIEW:CHANGE-TO-FULL(FULLSCALING)': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「表示の切り替え全画面に表示画面サイズに調整する」
      unimplemented();
    },
  },
  'PHOTOVIEW:CHANGE-TO-FULL(TILE)': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「表示の切り替え全画面に表示画面全体に敷きつめる」
      unimplemented();
    },
  },
  'PHOTOVIEW:CLOSE-ALL': {
    runnableWhileSharedLock: true,
    async run(parent, target) {
      // Action for 「全ての画像を閉じる」
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOVIEW:CHANGE-TO-ROTATE(90)': { // Action for 「右回りに回転」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      return true;
    },
    async run(parent, target) {
      let waitCursor = waitEffect(parent);
      try {
        let newAlbumFrames = [];
        let constructionId = target.constructionId;
        let albumId = target.albumIds[0];
        let frameId = target.frameIds[0];
        let albumFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)).albumFrame;
        if (albumFrame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
          let fieldValue = albumFrame.textFrames['goyo.photo.rotate'].fieldValue;
          switch (fieldValue) {
            case '90':
              fieldValue = '180';
              break;
            case '180':
              fieldValue = '270';
              break;
            case '270':
              fieldValue = '0';
              break;
            case '0':
            default:
              fieldValue = '90';
              break;
          }
          albumFrame.textFrames['goyo.photo.rotate'].fieldValue = fieldValue;
        } else {
          albumFrame.textFrames['goyo.photo.rotate'] = makeTextFrameField('goyo.photo.rotate', '90');
        }
        newAlbumFrames.push(albumFrame);
        await goyoAlbumOperation.updateFrames(constructionId, albumId, newAlbumFrames);
      } catch (e) {
        logger.error('PHOTOEDIT:EDIT-ROTATE', e);
      } finally {
        waitCursor.release();
      }
    },
  },
  'PHOTOVIEW:CHANGE-TO-ROTATE(270)': { // Action for 「左回りに回転」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      return true;
    },
    async run(parent, target) {
      let waitCursor = waitEffect(parent);
      try {
        let newAlbumFrames = [];
        let constructionId = target.constructionId;
        let albumId = target.albumIds[0];
        let frameId = target.frameIds[0];
        let albumFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)).albumFrame;
        if (albumFrame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
          let fieldValue = albumFrame.textFrames['goyo.photo.rotate'].fieldValue;
          switch (fieldValue) {
            case '90':
              fieldValue = '0';
              break;
            case '180':
              fieldValue = '90';
              break;
            case '270':
              fieldValue = '180';
              break;
            case '0':
            default:
              fieldValue = '270';
              break;
          }
          albumFrame.textFrames['goyo.photo.rotate'].fieldValue = fieldValue;
        } else {
          albumFrame.textFrames['goyo.photo.rotate'] = makeTextFrameField('goyo.photo.rotate', '270');
        }
        newAlbumFrames.push(albumFrame);
        await goyoAlbumOperation.updateFrames(constructionId, albumId, newAlbumFrames);
      } catch (e) {
        logger.error('PHOTOEDIT:EDIT-ROTATE', e);
      } finally {
        waitCursor.release();
      }
    },
  },
  'PHOTOVIEW:CHANGE-TO-ROTATE(0)': { // Action for 「回転を元に戻す」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      return true;
    },
    async run(parent, target) {
      let progressWindow;
      let lockManager;
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

        let newAlbumFrames = [];
        let constructionId = target.constructionId;
        let albumId = target.albumIds[0];

        let targetFrames;
        if (target.frameIds.length === 0) {
          let { albumFrames } = (await bookrackAccessor.getAlbumFrames(constructionId, albumId));
          targetFrames = albumFrames.filter(f => f.photoFrames.length>0);
        } else {
          let { albumFrame } = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, target.frameIds[0]));
          if (albumFrame.photoFrames.length > 0) {
            targetFrames = [ albumFrame ];
          }
        }

        if (Array.isArray(targetFrames) && targetFrames.length > 0) {
          for (let frame of targetFrames) {
            if (frame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
              frame.textFrames['goyo.photo.rotate'].fieldValue = '0';
            } else {
              frame.textFrames['goyo.photo.rotate'] = makeTextFrameField('goyo.photo.rotate', '0');
            }
          }

          let canceller = { cancel: false };
          progressWindow = goyoDialog.showProgressDialog(parent, () => {
            canceller.cancel = true;
          });

          await goyoAlbumOperation.updateFrames(
            constructionId,
            albumId,
            targetFrames,
            canceller,
            (done,total) => progressWindow.setProgress(done/total)
          );
          await progressWindow.close();
          progressWindow = null;
        }
      } catch (e) {
        logger.error('PHOTOEDIT:EDIT-ROTATE', e);
      } finally {
        if (progressWindow) {
          await progressWindow.close();
        }
        holder.release();
        if (lockManager != null){
          // release album lock
          lockManager.lockAlbum(target.albumIds[0], false)
            .then(() => {})
            .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)}); 
        }
      }
    },
  },

  ///////////////////////////////////////////////////////////////////
  // Photo editing
  ///////////////////////////////////////////////////////////////////
  'PHOTOEDIT:ADD-CLIPART': { // Action for 「クリップアートを追加」
    async isRunnable(type, target) {
      let [{ albumFrame }] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      let construction = await target.constructionInformation;
      return (construction.knack.knackType == 8 || construction.knack.knackType == 9);
    },
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:UNDO': { // Action for 「画像を元に戻す」
    async isRunnable(type, target, options) {
      if (!options.editted) return false;
      let construction = await target.constructionInformation;
      return construction.knack.knackType == 8 || construction.knack.knackType == 9;
    },
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:EDIT-BY-EXTERNAL-TOOLS': { // Action for 「画像を編集する」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      let [{ albumFrame }] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      let construction = await target.constructionInformation;
      return (construction.knack.knackType == 8 || construction.knack.knackType == 9);
    },
    async run(parent, target) {
      const EXE_PATH = 'mspaint.exe';
      let tempFilePath;
      let holder = holdWindowsStop();
      try {
        let albumFrame = (await target.frameInformations)[0].albumFrame;
        let pathImg = albumFrame.photoFrames[0].imageFile;
        tempFilePath = await createOriginalFile(pathImg);
        let imageOrientation = { flip: 'false', rotate: "0" };
        if (albumFrame && albumFrame.textFrames && albumFrame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
          imageOrientation.rotate = albumFrame.textFrames['goyo.photo.rotate'].fieldValue;
        }
        if (albumFrame && albumFrame.textFrames && albumFrame.textFrames.hasOwnProperty('goyo.photo.flip')) {
          imageOrientation.flip = albumFrame.textFrames['goyo.photo.flip'].fieldValue;
        }
        await imgOrienToAddExif(imageOrientation, tempFilePath);
        let imgHashCurreent = await getFileHashImage(tempFilePath);
        logger.info('run paint.');
        await new Promise((resolve,reject) => {
          cp.execFile(
            EXE_PATH, [tempFilePath],
            (err) => { if (err) reject(); else resolve(); });
        });
        logger.info('paint exit.');

        let imgHashUsingMsPaint = await getFileHashImage(tempFilePath);
        if (imgHashUsingMsPaint != -1 && imgHashCurreent != -1 && imgHashCurreent !== imgHashUsingMsPaint) {
          logger.info('show dialogs');
          await savePhotoFromExternalTools(parent, target, tempFilePath);
        }
      } catch(e) {
        logger.error('PHOTOEDIT:EDIT-BY-EXTERNAL-TOOLS', e);
      } finally {
        holder.release();
        if (tempFilePath) {
          await goyoTemporal.clearTemporal(tempFilePath);
        }
      }
    },
  },
  'PHOTOEDIT:SCALING': { // Action for 「拡大・縮小...」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      let [{ albumFrame }] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      let construction = await target.constructionInformation;
      return (construction.knack.knackType == 8 || construction.knack.knackType == 9);
    },
    async run(parent, target) {
      logger.debug("PHOTOEDIT:SCALING");
      let progressWindow;
      let lockManager = null;
      let isLockAlbumItemdb = false;
      if (target.frameIds.length === 1) {
        let ctx = {
          albumWindowSet: null,
        };
        ctx.albumWindowSet = AlbumWindowSet.get(target.constructionId, target.albumIds[0]);
        await ctx.albumWindowSet.openPhotoWindow(target.frameIds[0], true);
      } else {
        let holder = holdWindowsStop();
        let tempFiles = [];
        try {
          let check = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            '確認',
            '選択した画像のサイズを一括して変更します。\n一旦この操作を行うと、前の状態には戻せません。\nよろしいですか？',
            "はい(&Y)", "いいえ(&N)", false);
          if (check) {
            let frameInformations = await target.frameInformations;
            let width = frameInformations[0].albumFrame.photoFrames[0].width;
            let height = frameInformations[0].albumFrame.photoFrames[0].height;
            let ratio = saveRatio.getRatio();
            let result = await goyoDialog.showPhotoSizeChangeDialog(parent, { width, height, ratio });
            if (!result) {
              return false;
            }
            // lock albumItemdb (lock Construction)
            lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
            isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
            .then(()=>{return true})
            .catch((e)=>{
              return false;
            });
            if (!isLockAlbumItemdb) {
              await goyoDialog.showConstructionLockBusyDialog(parent);
              throw {message : 'Failed to lockManager.lockAlbumItemDatabase(lock)'}
            }
            saveRatio.setRatio(result.ratio);
            let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
            let albumFrames = [];
            let albumDetailResult = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
            let canceller = { cancel: false };
            progressWindow = goyoDialog.showProgressDialog(parent, () => {
              canceller.cancel = true;
            });
            let total = target.frameIds.length * 2;
            let done = 0;
            let skip = 0;
            for (let i = 0; i < album.albumFrames.length; i++) {
              let sourceAlbumFrame = album.albumFrames[i];
              if (sourceAlbumFrame.photoFrames[0] && target.frameIds.includes(sourceAlbumFrame.albumFrameId)) {
                let imageFile = sourceAlbumFrame.photoFrames[0].imageFile;
                if (imageFile.toLocaleLowerCase().endsWith('tpi')) {
                  // skip reserve frame
                  progressWindow.setProgress((++done) / total);
                  skip++;
                  continue;
                }
                let dirPath = path.join(path.dirname(sourceAlbumFrame.photoFrames[0].imageFile), 'temp');
                if (!fs.existsSync(dirPath)) {
                  fs.mkdirSync(dirPath);
                }
                let tempPathResize = path.join(dirPath, sourceAlbumFrame.photoFrames[0].fileArias);
                await resizeImage(sourceAlbumFrame.photoFrames[0].imageFile, tempPathResize, result.width, result.height, result.ratio);
                let makeAlbumFrames = await goyoAlbumOperation.makeAlbumFrames([tempPathResize], 'Album', albumDetailResult.albumDetail);
                makeAlbumFrames[0].albumFrameId = sourceAlbumFrame.albumFrameId;
                makeAlbumFrames[0].photoFrames[0].albumItemId = 0;
                makeAlbumFrames[0].photoFrames[0].photoFrameId = sourceAlbumFrame.photoFrames[0].photoFrameId;
                makeAlbumFrames[0].textFrames = sourceAlbumFrame.textFrames;
                makeAlbumFrames[0].constructionPhotoInformation = sourceAlbumFrame.constructionPhotoInformation;
                albumFrames.push(makeAlbumFrames[0]);
                tempFiles.push(tempPathResize);
              } else {
                skip++;
              }
              progressWindow.setProgress((++done) / total);
              if (canceller.cancel) {
                break;
              }
            }
            logger.debug("PHOTOEDIT:SCALING updateFrames");
            await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], albumFrames, 
              canceller, (d,t) => {
              progressWindow.setProgress((skip + (++done)) / total);
            });
            await progressWindow.close();
            progressWindow = null;
          }
        } catch (e) {
          logger.error('PHOTOEDIT:SCALING', e);
        } finally {
          if (progressWindow) {
            progressWindow.close();
          }
          if (lockManager != null && isLockAlbumItemdb) {
            // release construction lock
            await lockManager.lockAlbumItemDatabase(false)
            .then(()=>{})
            .catch((e)=>{
              logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
            });
          }
          for (let f of tempFiles) {
            fs.unlink(f, function (err) {
              if (err) {
                logger.error('Failed to unlink ', err);
              }
            });
          }
          holder.release();
        }
      }
    },
  },
  'PHOTOEDIT:SCALING-100': { // Action for 「倍率を100%にする」
    async isRunnable(type, target, options) {
      if (options.hasOwnProperty('scale') && options.scale !== 100) {
        return true;
      } else {
        return false;
      }
    },
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:SCALING-ALL': { // Action for 「全画像を拡大・縮小...」
    runnableWhileSharedLock: true,
    async isRunnable(type, target) {
      let construction = await target.constructionInformation;
      return construction.knack.knackType == 8 || construction.knack.knackType == 9;
    },
    async run(parent, target) {
      let progressWindow;
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let holder = holdWindowsStop();
      let tempFiles = [];
      try {
        let check = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          '選択した画像のサイズを一括して変更します。\n一旦この操作を行うと、前の状態には戻せません。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (!check) {
          return false;
        }
        let album = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
        let width;
        let height;
        let count = 0;
        for (let i = 0; i < album.albumFrames.length; i++) {
          if (album.albumFrames[i].photoFrames[0]) {
            width = album.albumFrames[i].photoFrames[0].width;
            height = album.albumFrames[i].photoFrames[0].height;
            count++;
            break;
          }
        }
        if (count === 0) {
          await goyoDialog.showErrorMessageDialog(
            parent,
            "エラー",
            "このアルバムには利用できる画像が1枚もありません。",
            "OK"
          );
          return false;
        }
        let ratio = saveRatio.getRatio();
        let result = await goyoDialog.showPhotoSizeChangeDialog(parent, { width, height, ratio });
        if (!result) {
          return false;
        }
        // lock albumItemdb (lock Construction)
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(()=>{return true})
        .catch((e)=>{
          return false;
        });
        if (!isLockAlbumItemdb) {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          throw {message : 'Failed to lockManager.lockAlbumItemDatabase(lock)'}
        }
        saveRatio.setRatio(result.ratio);
        let albumFrames = [];
        let albumDetailResult = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        let total = album.albumFrames.length * 2;
        let done = 0;
        let skip = 0;
        for (let i = 0; i < album.albumFrames.length; i++) {
          done = i + 1;
          let sourceAlbumFrame = album.albumFrames[i];
          if (sourceAlbumFrame.photoFrames[0]) {
            let imageFile = sourceAlbumFrame.photoFrames[0].imageFile;
            if (imageFile.toLocaleLowerCase().endsWith('tpi')) {
              // skip reserve frame
              progressWindow.setProgress((done) / total);
              skip++;
              continue;
            }
            let dirPath = path.join(path.dirname(imageFile), 'temp');
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath);
            }
            let tempPathResize = path.join(dirPath, sourceAlbumFrame.photoFrames[0].fileArias);
            await resizeImage(sourceAlbumFrame.photoFrames[0].imageFile, tempPathResize, result.width, result.height, result.ratio);
            let makeAlbumFrames = await goyoAlbumOperation.makeAlbumFrames([tempPathResize], 'Album', albumDetailResult.albumDetail);
            makeAlbumFrames[0].albumFrameId = sourceAlbumFrame.albumFrameId;
            makeAlbumFrames[0].photoFrames[0].albumItemId = 0;
            makeAlbumFrames[0].photoFrames[0].photoFrameId = sourceAlbumFrame.photoFrames[0].photoFrameId;
            makeAlbumFrames[0].photoFrames[0].fileArias = sourceAlbumFrame.photoFrames[0].fileArias;
            makeAlbumFrames[0].textFrames = sourceAlbumFrame.textFrames;
            makeAlbumFrames[0].constructionPhotoInformation = sourceAlbumFrame.constructionPhotoInformation;

            albumFrames.push(makeAlbumFrames[0]);
            tempFiles.push(tempPathResize);
          } else {
            skip++;
          }
          progressWindow.setProgress(done / total);
          if (canceller.cancel) {
            break;
          }
        }
        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], albumFrames, 
          canceller, (d,t) => {
          progressWindow.setProgress((skip + (++done)) / total);
        });
        await progressWindow.close();
        progressWindow = null;
      } catch (e) {
        logger.error('PHOTOEDIT:SCALING-ALL', e);
        throw e;
      } finally {
        if (progressWindow) {
          progressWindow.close();
        }
        if (lockManager != null && isLockAlbumItemdb) {
          // release construction lock
          await lockManager.lockAlbumItemDatabase(false)
          .then(()=>{})
          .catch((e)=>{
            logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
          });
        }
        for (let f of tempFiles) {
          fs.unlink(f, function (err) {
            if (err) {
              logger.error('Failed to unlink ', err);
            }
          });
        }
        holder.release();
      }
    },
  },
  'PHOTOEDIT:CROPPING': { // Action for 「切り抜き」
    async isRunnable(type, target) {
      let [{ albumFrame }] = await target.frameInformations;
      if (isTiffAlbumFrame(albumFrame)) {
        return false;
      }
      let construction = await target.constructionInformation;
      return (construction.knack.knackType == 8 || construction.knack.knackType == 9);
    },
    async run(parent, target) {
      if (target.frameIds.length === 1) {
        let ctx = {albumWindowSet: null};
        ctx.albumWindowSet = AlbumWindowSet.get(target.constructionId, target.albumIds[0]);
        await ctx.albumWindowSet.openPhotoWindow(target.frameIds[0], false, true);
      }
    },
  },
  'PHOTOEDIT:FIX-CLIPART': { // Action for 「確定」
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:EDIT-TRANSPARENCY': { // Action for 「透明度を設定...」
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:CANCEL-CLIPART': { // Action for 「選択している合成写真を削除」
    async run(parent, target) {
      // Currently, this action could not be called.
      // photo_view_window intercepts the action.
      unimplemented();
    },
  },
  'PHOTOEDIT:SAVE': { // Action for 「変更を保存」
    async isRunnable(type, target, options) {
      if (!options.editted) return false;
      let construction = await target.constructionInformation;
      return construction.knack.knackType == 8 || construction.knack.knackType == 9;
    },
    async run(parent, target) {
      unimplemented();
    },
  },
};


// internal functions
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
async function createOriginalFile(path) {
  if (fs.existsSync(path)) {
    let tempFilePath = await goyoTemporal.makeTemporal(path);
    return tempFilePath;
  } else {
    console.error('Not found ' + path);
    return null;
  }

};
async function getFileHashImage(imgUrl) {
  let metaDataList; // = await photoMetaDataAccessor.getPhotoMetadata([imgUrl]);
  // if (metaDataList.errors.length != 0) {
  //   return -1;
  // }
  // return metaDataList.results["0"]["FILE:HASH"].fieldValue;
};
async function restoreOriginImgInTemp(currImgPath, imgPathIsRestoredInTemp) {
  if (fsExtra.existsSync(currImgPath) && fsExtra.existsSync(imgPathIsRestoredInTemp)) {
    await fsExtra.remove(currImgPath);
    await fsExtra.copySync(imgPathIsRestoredInTemp, currImgPath);
  } else {
    console.log('Not found img url in temp folder:  ' + currImgPath + ' or ' + imgPathIsRestoredInTemp);
  }
};

async function savePhotoFromExternalTools(parent, target, tempFilePath) {
  let result = await goyoDialog.showPhotoSavingSelectionDialog(parent);
  let lockManager = null;
  let isLockAlbumItemdb = false;
  let albumDetailResult = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
  let makeAlbumFrames;

  try {
    let currentFrame = (await target.frameInformations)[0].albumFrame;
    let pathImg = currentFrame.photoFrames[0].imageFile;
    if (result === EDIT_SAVE_FRAME || result === EDIT_SAVE_ADD_FRAME) {
      // lock albumItemdb (lock Construction)
      lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
      isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
        .then(() => { return true })
        .catch((e) => { return false; });
      if (!isLockAlbumItemdb) {
        await goyoDialog.showConstructionLockBusyDialog(parent);
        throw { message: 'Failed to lockManager.lockAlbumItemDatabase(lock)' }
      }
    }
    let indexOf = currentFrame.photoFrames[0].fileArias.lastIndexOf(".");
    let nameArias = getDateTimeToDay() + currentFrame.photoFrames[0].fileArias.substring(indexOf);
    switch (result) {
      case EDIT_SAVE_FRAME:
        makeAlbumFrames = await goyoAlbumOperation.makeAlbumFrames([tempFilePath], 'Album', albumDetailResult.albumDetail);
        // makeAlbumFrames[0].albumFrameId = currentFrame.albumFrameId;
        // makeAlbumFrames[0].photoFrames[0].fileArias = currentFrame.photoFrames[0].fileArias;
        // makeAlbumFrames[0].photoFrames[0].photoFrameId = currentFrame.photoFrames[0].photoFrameId;
        // makeAlbumFrames[0].textFrames = currentFrame.textFrames;
        // if (makeAlbumFrames[0].textFrames.hasOwnProperty('goyo.photo.flip')) {
        //   makeAlbumFrames[0].textFrames['goyo.photo.flip'].fieldValue = 'false';
        // }
        // if (makeAlbumFrames[0].textFrames.hasOwnProperty('goyo.photo.rotate')) {
        //   makeAlbumFrames[0].textFrames['goyo.photo.rotate'].fieldValue = '0';
        // }
        // makeAlbumFrames[0].constructionPhotoInformation = currentFrame.constructionPhotoInformation;
        let convertedFrame = convertFrameInfo(makeAlbumFrames[0],currentFrame);
        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [convertedFrame]);
        break;
      case EDIT_SAVE_ADD_FRAME:
        let newPath = path.join(os.tmpdir(), nameArias);
        if (fsExtra.existsSync(tempFilePath)) {
          fsExtra.copySync(tempFilePath, newPath);
        }
        makeAlbumFrames = await goyoAlbumOperation.makeAlbumFrames([newPath], 'Album', albumDetailResult.albumDetail);
        makeAlbumFrames[0].photoFrames[0].fileArias = nameArias;
        let albumFrames = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
        let nextFrameId = null;
        if (currentFrame.displayNumber !== albumFrames.albumFrames.length) {
          nextFrameId = albumFrames.albumFrames[currentFrame.displayNumber].albumFrameId;
        }
        await goyoAlbumOperation.replaceAndInsertFrames(target.constructionId, target.albumIds[0], [makeAlbumFrames[0]], nextFrameId);
        if (fsExtra.existsSync(newPath)) {
          fsExtra.removeSync(newPath);
        }
        break;
      case EDIT_SAVE_PICTURE_FILE:
        let file = fs.readFileSync(tempFilePath);
        let type = filetype(file);
        let nameInput = getDateTimeToDay() + '.' + type.ext;
        let outputFileFilter = goyoAppDefaults.outputFileFilter.find(f => f.extensions[0] === type.ext);
        let saveFile = await goyoDialog.showSaveFileSelectionDialog(parent,
          goyoAppDefaults.DIALOG_SAVE_OTHER_TITLE,
          nameInput,
          [outputFileFilter]);
        if (saveFile === undefined) {
          return;
        }
        if (!saveFile.toLowerCase().endsWith(type.ext)) {
          // force original extension
          saveFile = saveFile + '.' + type.ext;
        }
        let buf = Buffer.from(file);
        fs.writeFileSync(saveFile, buf);
        break;
      default:
        break;
    }
  } finally {
    if (lockManager != null && isLockAlbumItemdb) {
      // release construction lock
      await lockManager.lockAlbumItemDatabase(false)
        .then(() => { })
        .catch((e) => {
          logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
        });
    }
  }
};

function getDateTimeToDay() {
  let today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1; //January is 0!
  let yyyy = today.getFullYear();
  let h = today.getHours();
  let m = today.getMinutes();
  let s = today.getSeconds();
  let ms = today.getMilliseconds();
  dd = dd < 10 ? '0' + dd : dd;
  mm = mm < 10 ? '0' + mm : mm;
  h = h < 10 ? '0' + h : h;
  m = m < 10 ? '0' + m : m;
  s = s < 10 ? '0' + s : s;
  today = yyyy + '' + mm + '' + dd + '_' + h + '' + m + '' + s + '' + ms;
  return today;
}

function convertFrameInfo(convertFrame = {},currentFrame){
  convertFrame.albumFrameId = currentFrame.albumFrameId;
  convertFrame.photoFrames[0].albumItemId = 0;
  convertFrame.photoFrames[0].fileArias = currentFrame.photoFrames[0].fileArias;
  convertFrame.photoFrames[0].photoFrameId = currentFrame.photoFrames[0].photoFrameId;
  convertFrame.textFrames = currentFrame.textFrames;
  if (convertFrame.textFrames.hasOwnProperty('goyo.photo.flip')) {
    convertFrame.textFrames['goyo.photo.flip'].fieldValue = 'false';
  }
  if (convertFrame.textFrames.hasOwnProperty('goyo.photo.rotate')) {
    convertFrame.textFrames['goyo.photo.rotate'].fieldValue = '0';
  }
  convertFrame.constructionPhotoInformation = currentFrame.constructionPhotoInformation;
  return convertFrame;
}
module.exports = actions;
