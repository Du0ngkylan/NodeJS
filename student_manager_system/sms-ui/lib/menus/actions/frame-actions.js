'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');

// Electron modules.
const {
  clipboard
} = require('electron');

// Goyo modules.
const {
  viewMode,
  BookrackViewWindowSet
} = require('../../goyo-window-controller');
const bookrackAccessor = require('goyo-bookrack-accessor');
const metaDataAccessor = require('photo-metadata-accessor');
const photoInformation = require('../../construction-photo-information/make');
const goyoDialog = require('../../goyo-dialog-utils');
const { holdWindowsStop } = require('../../goyo-utils');
const { waitEffect }      = require('../../goyo-utils');
const settingsOperation = require('../../goyo-settings-operation');
const programSettings = require('../../goyo-program-settings');
const goyoAlbumOperation = require('../../goyo-album-operation');
const goyoAlbumLayout = require('../../layout/goyo-album-layout');
const logger = require('../../goyo-log')('frame-actions');
const goyoAppDefaults = require('../../goyo-app-defaults');
const photoMetaDataUtils = require('../../photo-metadata-utils');
const { isTiffAlbumFrame } = require('./action-common');
const lockFactory = require('../../lock-manager/goyo-lock-manager');
const { generatePhotoInformationMaker } = require('../../photo-information-text');

// 3rd-party modules.
const fse = require('fs-extra');

const SUPPORT_FILE_TYPE = ['.jpg','.jpeg','.gif','.png','.bmp']

// Internal functions.
function unimplemented() {
  console.log('menu-actions: unimplemented action is executed');
}


const actions = {
  ///////////////////////////////////////////////////////////////////
  // Frame
  ///////////////////////////////////////////////////////////////////
  'FRAME:MAKE-SENTENCE-FROM-METADATA': {
    // Action for 「画像情報を文章にする...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      try {
        const constructionId = target.constructionId;
        const albumId = target.albumIds[0];
        // get current frame
        let fi = (await target.frameInformations)[0];
        let text = await getTextFrameKeyFormat(target, fi.albumFrame.displayNumber - 1);
        if (text.key == null) {
          await goyoDialog.showWarningMessageDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            '編集対象のテキスト領域が指定されていません。', 'OK');
          return;
        }

        if (!textFrameIsEmpty(fi.albumFrame.textFrames, text.key)) {
          let result = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            'この操作の結果、現在の文章は削除されますがよろしいですか？',
            'はい(&Y)', 'いいえ(&N)', false);
          if (!result) {
            return;
          }
        }

        // get sentence
        let result = await programSettings.editPhotoFileInformationSetting(parent);
        if (!result) {
          return;
        }

        let photoInfo = photoMetaDataUtils.getFormattedMetadataKeyAll(fi.albumFrame.photoFrames[0].fileArias,
           fi.albumFrame.photoFrames[0].extraInfo);
        let metadata = result.displaySettings;
        let flag = false;
        //check filePropertyMap - generalInformation
        let generalInformation = metadata.generalInformation;
        let resultSentenceText = '';
        for (const generalInfo in generalInformation) {
          if (generalInformation[generalInfo] === 1) {
            if (photoInfo.fileInfos.hasOwnProperty(generalInfo)) {
              flag = true;
              let data = photoInfo.fileInfos[generalInfo];
              if (metadata.informationName === 1) {
                resultSentenceText += data[1] + '\n';
              } else {
                resultSentenceText += `【${data[0]}】`.padEnd(30 - `【${data[0]}】`.length) + data[1] + '\n';
              }
            }
          }
        }
        if (flag) {
          if (metadata.informationName !== 1) {
            resultSentenceText = '<<一般的な情報>>\n' + resultSentenceText;
            flag = false;
          } else {
            resultSentenceText = resultSentenceText;
          }
        }
        // check additionalPropertyMap
        let resultSentenceText1 = '';
        let additionalInformation = metadata.additionalInformation;
        for (const additionalInfor in additionalInformation) {
          if (additionalInformation[additionalInfor] === 1) {
            if (photoInfo.additionalInfos.hasOwnProperty(additionalInfor)) {
              flag = true;
              let data = photoInfo.additionalInfos[additionalInfor];
              if (metadata.informationName === 1) {
                resultSentenceText1 += data[1] + '\n';
              } else {
                resultSentenceText1 += `【${data[0]}】`.padEnd(30 - `【${data[0]}】`.length) + data[1] + '\n';
              }
            }
          }
        }
        // check exifInformation
        let exifInformation = metadata.exifInformation;
        for (const exifInfor in exifInformation) {
          if (exifInformation[exifInfor] === 1) {
            if (photoInfo.exifInfos.hasOwnProperty(exifInfor)) {
              flag = true;
              let data = photoInfo.exifInfos[exifInfor];
              if (metadata.informationName === 1) {
                resultSentenceText1 += data[1] + '\n';
              } else {
                resultSentenceText1 += `【${data[0]}】`.padEnd(30 - `【${data[0]}】`.length) + data[1] + '\n';
              }
            }
          }
        }
        if (flag) {
          if (metadata.informationName !== 1) {
            resultSentenceText1 = '<<付加情報>>\n' + resultSentenceText1;
            flag = false;
          } else {
            resultSentenceText1 = resultSentenceText1;
          }
        }

        resultSentenceText += resultSentenceText1;

        if (fi.albumFrame.textFrames.hasOwnProperty(text.key)) {
          fi.albumFrame.textFrames[text.key].fieldValue = resultSentenceText;
          fi.albumFrame.textFrames[text.key].richText = {};
        } else {
          fi.albumFrame.textFrames[text.key] = 
            makeTextFrameField(text.key, resultSentenceText);
        }
        await goyoAlbumOperation.updateFrames(constructionId, albumId, [fi.albumFrame]);
      } catch (e) {
        logger.error('FRAME:MAKE-SENTENCE-FROM-METADATA', e);
      }
    },
  },
  'FRAME:EDIT-FRAME-INFORMATION': { // Action for 「画像の設定...」 or 「フレームの設定...」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.frameIds.length === 1;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let text = await getTextFrameKeyFormat(target);
        await goyoAlbumOperation.editFrameSettings(parent, target.constructionId, target.albumIds[0], target.frameIds[0], text.key, text.textFormat);
      } catch (e) {
        // ignore exception
      } finally {
        holder.release();
      }
    },
  },
  'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD': {
    runnableWhileSharedLock : true,
    // Action for 「クリップボードから画像を取り込み」
    async isRunnable(type, target) {
      let clipboardText = clipboard.readText('PHOTO');
      return clipboardText.includes('frameId');
    },
    async run(parent, target) {
      let lockManager = null;
      let waitCursor;
      let isLockAlbumItemdb = false;
      try {
        // lock albumItemdb (lock Construction)
        waitCursor = waitEffect(parent);
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

        let clipboardText = clipboard.readText('PHOTO-TO-CLIPBOARD');
        if (clipboardText != null && clipboardText.trim() !== '') {
          let clipboardJSON;
          try {
            clipboardJSON = JSON.parse(clipboardText);
          } catch (e) {
            throw "ExceptionOfParseJson";
          }
          let newFrames=[]
          let isOnlyPhoto = false;
          if (clipboardJSON.isOnlyPhoto != undefined){
            isOnlyPhoto = clipboardJSON.isOnlyPhoto;
          }
          for (let i = 0; i <clipboardJSON.frameId.length; i++){
            let albumFrame;
            if (clipboardJSON.albumFrame){
              albumFrame = clipboardJSON.albumFrame[i];
            } else {
              albumFrame = (await bookrackAccessor.getAlbumFrame(clipboardJSON.constructionId, clipboardJSON.albumId, clipboardJSON.frameId[i])).albumFrame;
            }
            albumFrame.albumFrameId = 0;
            if (albumFrame.photoFrames[0]) {
              delete albumFrame.photoFrames[0].albumItemId;
              albumFrame.photoFrames[0].photoFrameId = 0;
            }
            for (let ind in albumFrame.textFrames) {
              albumFrame.textFrames[ind].textFrameId = 0;
            }
            if (isOnlyPhoto){
              albumFrame.constructionPhotoInformation = {};
              for (let index in albumFrame.textFrames) {
                if (index !== 'goyo.photo.flip' &&
                  index !== 'goyo.photo.rotate') {
                    albumFrame.textFrames[index] = {};
                }
              }
              let indexOf = albumFrame.photoFrames[0].fileArias.lastIndexOf(".");
              let nameArias = getDateTimeToDay() + albumFrame.photoFrames[0].fileArias.substring(indexOf);
              albumFrame.photoFrames[0].fileArias = nameArias;
            }
            newFrames.push(albumFrame)
          }
          newFrames.sort(function(obj1, obj2) {
            return obj1.displayNumber - obj2.displayNumber;
          });
          let canceller = { cancel: false };
          var result = await goyoAlbumOperation.replaceAndInsertFrames(
            target.constructionId,
            target.albumIds[0],
            newFrames,
            (target.frameIds.length > 0) ? target.frameIds[0] : undefined,
            canceller);
        }  
      } catch (e) {
        if (e === 'ExceptionOfParseJson') {
          logger.info('FRAME:IMPORT-PHOTO-FROM-CLIPBOARD : '+ e);
        } else {
          logger.error('FRAME:IMPORT-PHOTO-FROM-CLIPBOARD', e);
        }
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
  'FRAME:IMPORT-PAGES-FROM-CLIPBOARD': {
    runnableWhileSharedLock : true,
    // Action for 「クリップボードから見開き2ページを取り込み」
    async isRunnable(type, target) {
      let clipboardText = clipboard.readText('PHOTO');
      return !clipboardText.includes('frameId');
    },
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
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
        
        let clipboardText = clipboard.readText('PAGE-TO-CLIPBOARD');
        if (clipboardText != null && clipboardText.trim() !== '') {
          let clipboardJSON;
          try {
            clipboardJSON = JSON.parse(clipboardText);
          } catch (e) {
            throw "ExceptionOfParseJson";
          }
          let startFrame = Math.floor((clipboardJSON.page - 1) / 2) * clipboardJSON.quantityFramesPerPage;
          let albumFrames;
          if(clipboardJSON.albumFrames){
            albumFrames = clipboardJSON.albumFrames;
          }else{ 
            albumFrames = (await bookrackAccessor.getAlbumFrames(clipboardJSON.constructionId, clipboardJSON.albumId, startFrame, clipboardJSON.quantityFramesPerPage)).albumFrames;
          }
          let newBlankFrame = 0;
          if (clipboardJSON.quantityFramesPerPage > target.quantityFramesPerPage) {
            newBlankFrame = clipboardJSON.quantityFramesPerPage - target.quantityFramesPerPage;
          } else if (clipboardJSON.quantityFramesPerPage < target.quantityFramesPerPage) {
            newBlankFrame = target.quantityFramesPerPage - clipboardJSON.quantityFramesPerPage;
          }
          for (let i = 0; i < albumFrames.length; i++) {
            albumFrames[i].albumFrameId = 0;
            if (albumFrames[i].photoFrames[0]) {
              delete albumFrames[i].photoFrames[0].albumItemId;
              albumFrames[i].photoFrames[0].photoFrameId = 0;
            }
            for (var ind in albumFrames[i].textFrames) {
              albumFrames[i].textFrames[ind].textFrameId = 0;
            }
          }
          for (const frame of albumFrames) {
            if (!frame.constructionPhotoInformation || Object.keys(frame.constructionPhotoInformation['写真情報']).length === 0) {
              delete frame.constructionPhotoInformation;
            }
          }
          await goyoAlbumOperation.insertFrames(target.constructionId, target.albumIds[0], albumFrames, target.targetFrameId);
          if (newBlankFrame > 0) {
            await goyoAlbumOperation.insertEmptyFrames(target.constructionId, target.albumIds[0], newBlankFrame, target.targetFrameId);
          }
        }
      } catch (e) {
        if (e === 'ExceptionOfParseJson') {
          logger.info('FRAME:IMPORT-PHOTO-FROM-CLIPBOARD: '+ e);
        } else {
          logger.error('FRAME:IMPORT-PHOTO-FROM-CLIPBOARD', e);
        }
      } finally {
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
  'FRAME:EXPORT-PHOTO-TO-CLIPBOARD': {
    runnableWhileSharedLock : true,
    async run(parent, target) {
      // Action for 「クリップボードに画像を貼り付け」
      clipboard.writeText(JSON.stringify({
        constructionId: target.constructionId,
        albumId: target.albumIds[0],
        frameId: target.frameIds
      }), 'PHOTO-TO-CLIPBOARD');

      // try to write image to clipboard
      // const nativeImage = require('electron').nativeImage;
      // let frameInformations = await target.frameInformations;
      // let photoFramePath = frameInformations[0].albumFrame.photoFrames[0].imageFile;
      // let image = nativeImage.createFromPath(photoFramePath);
      // clipboard.writeImage(image);
    },
  },
  'FRAME:EXPORT-PAGES-TO-CLIPBOARD': { // Action for 「クリップボードに見開き2ページを貼り付け」
    runnableWhileSharedLock : true,
    async run(parent, target) {
      clipboard.writeText(JSON.stringify({
        constructionId: target.constructionId,
        albumId: target.albumIds[0],
        page: target.page,
        quantityFramesPerPage: target.quantityFramesPerPage
      }), 'PAGE-TO-CLIPBOARD');
    },
  },
  'FRAME:DELETE-PHOTO-INFORMATION': { // Action for 「工事写真情報を削除」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      try {
        let frames = await target.frameInformations;
        if (frames.length === 1) {
          if (isTiffAlbumFrame(frames[0].albumFrame)) {
            return false;
          }
        }
        return frames.some(frame => frame.albumFrame.constructionPhotoInformation && frame.albumFrame.constructionPhotoInformation.hasOwnProperty('写真情報'));
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    async run(parent, target) {
      try {
        var albumFrame = (await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0])).albumFrame;
        if (albumFrame.constructionPhotoInformation !== null) {
          albumFrame.constructionPhotoInformation = {
            '写真情報': {}
          };
        }

        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [albumFrame]);
      } catch (e) {
        logger.error('DELETE-PHOTO-INFORMATION', e);
        return false;
      }
    },
  },
  'FRAME:EDIT-PHOTO-INFORMATION': {
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      let fi = (await target.frameInformations)[0];
      if (isTiffAlbumFrame(fi.albumFrame)) {
        return false;
      }
      return true;
    },
    async run(parent, target, options) {
      // Action for 「工事写真情報を登録」
      let holder = holdWindowsStop(parent);
      try {
        await goyoAlbumOperation.editPhotoInformation(parent, target.constructionId, target.albumIds[0], target.frameIds[0]);
      } catch (e) {
        logger.error('EDIT-PHOTO-INFORMATION', e);
        return false;
      } finally {
        holder.release();
      }
    },
  },
  'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION': {
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // Action for 「工事写真情報を文章にする...」
      try {

        const constructionId = target.constructionId;
        const albumId = target.albumIds[0];

        // get current frame
        let construction = await target.constructionInformation;
        let fi = (await target.frameInformations)[0];

        // check text key.
        let text = await getTextFrameKeyFormat(target, fi.albumFrame.displayNumber - 1);
        if (text.key == null) {
          await goyoDialog.showWarningMessageDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            '編集対象のテキスト領域が指定されていません。', 'OK');
          return;
        }

        if (fi.albumFrame.constructionPhotoInformation == null
         || !fi.albumFrame.constructionPhotoInformation.hasOwnProperty('写真情報')
         || Object.keys(fi.albumFrame.constructionPhotoInformation['写真情報']).length===0) {
          await goyoDialog.showWarningMessageDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            '文章にする工事写真情報が登録されていません。', 'OK');
          return;
        }

        // confirmination for deleting current text.
        if (!textFrameIsEmpty(fi.albumFrame.textFrames, text.key)) {
          let result = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent, goyoAppDefaults.DIALOG_TITLE,
            'この操作の結果、現在の文章は削除されますがよろしいですか？',
            'はい(&Y)', 'いいえ(&N)', false);
          if (!result) {
            return;
          }
        }

        // get selection.
        const result = await goyoDialog.showPhotoInformationSelectionDialog(parent, construction.knack.knackId, construction.photoInformationTags);
        if (!result) {
          return;
        }

        // make sentence.
        let photoInformationMaker = generatePhotoInformationMaker(construction.knack, result, construction.photoInformationTags);
        let photoText = photoInformationMaker.make(fi.albumFrame.constructionPhotoInformation);
        logger.info(photoText);

        // update frame.
        if (fi.albumFrame.textFrames.hasOwnProperty(text.key)) {
          fi.albumFrame.textFrames[text.key].fieldValue = photoText;
          fi.albumFrame.textFrames[text.key].richText = {};
        } else {
          fi.albumFrame.textFrames[text.key] = makeTextFrameField(text.key, photoText);
        }
        await goyoAlbumOperation.updateFrames(constructionId, albumId, [fi.albumFrame]);

      } catch (e) {
        logger.error('FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION', e);
      }
    },
  },
  'FRAME:ADD-BOOKMARK': { // Action for 「このフレームにしおりを付ける...」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      try {
        /*
         * カラー選択方法(color selection method)
         *  ①挿入される栞の前後の色と被らないこと
         *    not use same color with just before or just after the new bookmark.
         *  ②除外されたものの中から最も使用頻度の少ないカラーを選択
         *    select minimum used color except for aboves.
         */
        let justBefore = null;
        let justAfter = null;
        let colorCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        //let albumFrame = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
        let albumFrame = (await target.frameInformations)[0].albumFrame;
        let { bookmarks } = await bookrackAccessor.getBookmarks(target.constructionId, target.albumIds[0]);
        for (const bm of bookmarks) {
          if (bm.albumFramePosition === albumFrame.displayNumber) {
            await goyoDialog.showWarningMessageDialog(parent, '警告', '既にしおりが存在します。同じフレームにしおりは追加できません。', 'OK');
            return;
          } else if (bm.albumFramePosition < albumFrame.displayNumber) {
            justBefore = bm;
          } else if (!justAfter) {
            justAfter = bm;
          }

          colorCount[bm.bookmarkColor]++;
        }

        let result = await goyoDialog.showBookmarkCreateWindow(parent, '');
        if (result != null && result.bookmarkName.length > 0) {

          // condition①
          if (justBefore) colorCount[justBefore.bookmarkColor] = 10000;
          if (justAfter) colorCount[justAfter.bookmarkColor] = 10000;
          // condition②
          let [count, idx] = colorCount.reduce((acc,val,idx) => (acc[0] >= val) ? [val, idx] : acc, [10000,0]);

          let bookmark = {
            bookmarkId: 0,
            bookmarkName: result.bookmarkName,
            bookmarkColor: idx,
            albumFramePosition: albumFrame.displayNumber,
          }
          let createdBookmarks = await goyoAlbumOperation.addBookmarks(target.constructionId, target.albumIds[0], [bookmark]);
        }
      } catch (e) {
        logger.error('FRAME:ADD-BOOKMARK', e);
      }
    },
  },
  'FRAME:ADD-REFERENCE-FILE': {
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      let fi = (await target.frameInformations)[0];
      if (isTiffAlbumFrame(fi.albumFrame)) {
        return false;
      }
      let knackType = (await target.constructionInformation).knack.knackType;
      let frame = (await target.frameInformations)[0];

      return target.frameIds.length === 1 && frame.albumFrame.referenceSouceAlbumFrameId === 0 && !(
        knackType === 1 ||
        knackType === 2 ||
        knackType === 7
      );
    },
    async run(parent, target) {
      // Action for 「参考図ファイルを登録」
      let waitCursor;
      let fileList = await goyoDialog.showOpenFileSelectionDialog(
        parent,
        goyoAppDefaults.DIALOG_INPUT_FILE_TITLE,
        undefined,
        goyoAppDefaults.inputFileFilter,
        false
      );
      if (!fileList) {
        return;
      }
      let extName = (path.extname(fileList[0])).toLowerCase();
      if (!SUPPORT_FILE_TYPE.includes(extName)) {

        await goyoDialog.showWarningMessageDialog(
          parent,
          '参考図',
          '画像(JPEG/PNG/BMP/GIF)ファイルを指定してください。',
          'OK'
        );
        return;
      }
      let construction = await target.constructionInformation;
      let constructionId = construction.constructionId;
      let albumId = target.albumIds[0];
      let albumFrame = (await target.frameInformations)[0].albumFrame;
      let frameId = albumFrame.albumFrameId;
      let param = {};
      param.knack = construction.knack;
      param.title = '';
      param.budget = '';
      let result = await goyoDialog.showReferenceSettingDialog(parent, param);
      if (!result) {
        return;
      }
      if (albumFrame.constructionPhotoInformation['写真情報'] === undefined) {
        albumFrame.constructionPhotoInformation['写真情報'] = {};
      }
      let photoInfo = albumFrame.constructionPhotoInformation['写真情報'];
      if (photoInfo['参考図'] === undefined) {
        photoInfo['参考図'] = [];
      }
    
      let newPhotoInfo = null;
      if(construction.knack.knackType === 3) {
        newPhotoInfo = {
          "referenceDiagramId": 0,
          'referenceDiagramAlbumFrameId': 0,
          '参考図ファイル名': fileList[0],
          'メモ１': result.memo1,
          'メモ２': result.memo2,
        }
      } else {
        newPhotoInfo = {
          "referenceDiagramId": 0,
          'referenceDiagramAlbumFrameId': 0,
          '参考図ファイル名': fileList[0],
          '参考図タイトル': result.title,
          '付加情報予備': result.budget,
        }
      }
    
      albumFrame.constructionPhotoInformation['写真情報'] = photoInfo;

      let lockManager = null;
      let isLockAlbumItemdb = false;
      try {
        waitCursor = waitEffect(parent);
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

        let albumDetailResult = await bookrackAccessor.getAlbumDetail(constructionId, albumId);

        //let newFrameId = (await goyoAlbumOperation.insertEmptyFrames(constructionId, albumId, 1, frameId, true))[0];
        let newFrame = (await goyoAlbumOperation.makeAlbumFrames([fileList[0]], 'Album', albumDetailResult.albumDetail))[0];
        delete newFrame.constructionPhotoInformation["写真情報"];
        if(newFrame.constructionPhotoInformation["参考図情報"] === undefined) {
          newFrame.constructionPhotoInformation["参考図情報"] = null;
        }
        let diagramPhotoInfo = null;
        if(construction.knack.knackType === 3) {
          diagramPhotoInfo = {
            '写真ファイル名': fileList[0],
            'メモ１': result.memo1,
            'メモ２': result.memo2,
          };
        } else {
          diagramPhotoInfo = {
            '写真ファイル名': fileList[0],
            '参考図タイトル': result.title,
            '付加情報予備': result.budget,
          };
        }
        newFrame.constructionPhotoInformation["参考図情報"] = diagramPhotoInfo;
        newFrame.referenceSouceAlbumFrameId = frameId;
  
        let newFrameIds = await goyoAlbumOperation.replaceAndInsertFrames(
          constructionId,
          albumId,
          [newFrame],
          frameId, undefined, undefined, true
        );
        if (newFrameIds.length === 1) {
          newPhotoInfo.referenceDiagramAlbumFrameId = newFrameIds[0];
          photoInfo['参考図'].push(newPhotoInfo);
          await goyoAlbumOperation.updateFrames(constructionId, albumId, [albumFrame]);
        }  

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
  'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN': { // Action for 「小黒板情報を工事写真情報に反映」
    runnableWhileSharedLock : true,
    async isRunnable(type, target) {
      return target.frameIds.length <= 1;
    },
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
        if (target.frameIds.length === 1) {
          let albumFrame = (await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0])).albumFrame;
          if (albumFrame.photoFrames.length === 0) {
            return;
          }

          if (!albumFrame.photoFrames[0].extraInfo.hasOwnProperty('XMP:XMP')) {
            await goyoDialog.showSimpleMessageDialog(
              parent,
              goyoAppDefaults.DIALOG_TITLE,
              'この画像にはJACICの小黒板情報が含まれていません。',
              'OK');
            return;
          }

          let question = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            goyoAppDefaults.DIALOG_TITLE,
            'この操作の結果、現在の工事写真情報は小黒板情報で置き換えられますがよろしいですか？',
            'はい(&Y)', 'いいえ(&N)', false);
          if (!question) {
            return;
          }

          let referenceDiagram = [];
          let referenceDiagramInfo = [];
          if(albumFrame.constructionPhotoInformation.hasOwnProperty("写真情報") &&
              albumFrame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図")) {
            referenceDiagram = albumFrame.constructionPhotoInformation["写真情報"]["参考図"];
          }
          if(albumFrame.constructionPhotoInformation.hasOwnProperty("写真情報") &&
              albumFrame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図情報")) {
            referenceDiagramInfo = albumFrame.constructionPhotoInformation["写真情報"]["参考図情報"];
          }
          let photoInfo = photoInformation.fromJacicXMP({
            'XMP:XMP': { 'fieldValue': albumFrame.photoFrames[0].extraInfo['XMP:XMP'] },
            'EXIF:DateTimeOriginal': albumFrame.photoFrames[0].extraInfo.hasOwnProperty('EXIF:DateTimeOriginal') ? { 'fieldValue': albumFrame.photoFrames[0].extraInfo['EXIF:DateTimeOriginal'] } : undefined,
            'EXIF:CreateDate': albumFrame.photoFrames[0].extraInfo.hasOwnProperty('EXIF:CreateDate') ? { 'fieldValue': albumFrame.photoFrames[0].extraInfo['EXIF:CreateDate'] } : undefined,
            'FILE:FileDate': albumFrame.photoFrames[0].extraInfo.hasOwnProperty('FILE:FileDate') ? { 'fieldValue': albumFrame.photoFrames[0].extraInfo['FILE:FileDate'] } : undefined,
          });
          if(referenceDiagram.length > 0) {
            photoInfo["写真情報"]["参考図"] = referenceDiagram;
          }
          if(referenceDiagramInfo.length > 0) {
            photoInfo["写真情報"]["参考図情報"] = referenceDiagramInfo;
          }
          albumFrame.constructionPhotoInformation = photoInfo;
          await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [albumFrame]);
        } else {
          let question = await goyoDialog.showSimpleBinaryQuestionDialog(
            parent,
            goyoAppDefaults.DIALOG_TITLE,
            'この操作の結果、アルバム内の全ての工事写真情報が小黒板情報で置き換えられますがよろしいですか？\n（JACIC小黒板情報が含まれない画像は除く）',
            'はい(&Y)', 'いいえ(&N)', false);
          if (!question) {
            return;
          }

          let canceller = {
            cancel: false
          };
          progressWindow = goyoDialog.showProgressDialog(parent, () => {
            canceller.cancel = true;
          }); 
          let { albumFrames } = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);

          let updatedAlbumFrames = 
            albumFrames.map(frame => {
              if (frame.photoFrames.length === 0 || !frame.photoFrames[0].extraInfo.hasOwnProperty('XMP:XMP')) {
                return null;
              }
              let referenceDiagram = [];
              let referenceDiagramInfo = [];
              if(frame.constructionPhotoInformation.hasOwnProperty("写真情報") &&
              frame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図")) {
                referenceDiagram = frame.constructionPhotoInformation["写真情報"]["参考図"];
              }
              if(frame.constructionPhotoInformation.hasOwnProperty("写真情報") &&
              frame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図情報")) {
                referenceDiagramInfo = frame.constructionPhotoInformation["写真情報"]["参考図情報"];
              }
              let photoInfo = photoInformation.fromJacicXMP({
                'XMP:XMP': { 'fieldValue': frame.photoFrames[0].extraInfo['XMP:XMP'] },
                'EXIF:DateTimeOriginal': frame.photoFrames[0].extraInfo.hasOwnProperty('EXIF:DateTimeOriginal') ? { 'fieldValue': frame.photoFrames[0].extraInfo['EXIF:DateTimeOriginal'] } : undefined,
                'EXIF:CreateDate': frame.photoFrames[0].extraInfo.hasOwnProperty('EXIF:CreateDate') ? { 'fieldValue': frame.photoFrames[0].extraInfo['EXIF:CreateDate'] } : undefined,
                'FILE:FileDate': frame.photoFrames[0].extraInfo.hasOwnProperty('FILE:FileDate') ? { 'fieldValue': frame.photoFrames[0].extraInfo['FILE:FileDate'] } : undefined,
              });
              if(referenceDiagram.length > 0) {
                photoInfo["写真情報"]["参考図"] = referenceDiagram;
              }
              if(referenceDiagramInfo.length > 0) {
                photoInfo["写真情報"]["参考図情報"] = referenceDiagramInfo;
              }
              frame.constructionPhotoInformation = photoInfo;
              return frame;
            }).filter(frame => frame!=null);

          await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], updatedAlbumFrames, canceller, (done, total) => {
            progressWindow.setProgress(done / total);
          });
          if (!canceller.cancel) {
            progressWindow.setProgress(1);
          }
        }
      } catch (e) {
        logger.error('getSentence', e);
        return false;
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
  'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL': {
    // Action for 「全画像について画像情報を文章にする...」
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
        let yn = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          'この操作の結果、アルバム内の全ての文章が置き換えられますがよろしいですか？',
          'はい(&Y)', 'いいえ(&N)', false);
        if (!yn) {
          return;
        }
        let result = await programSettings.editPhotoFileInformationSetting(parent);
        if (!result) {
          return;
        }

        yn = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '本当に実行してよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
        if (!yn) {
          return;
        }

        let [ albumDetail ] = await target.albumDetails;
        let layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumDetail.layout.albumTemplate);
        let displaySettings = result.displaySettings;
        const constructionId = target.constructionId;
        const albumId = target.albumIds[0];
        let frameInformations = await bookrackAccessor.getAlbumFrames(constructionId, albumId);
        let albumFrames = frameInformations.albumFrames;
        let albumFramesArray = []
        for (let albumFrame of albumFrames) {
          if (albumFrame.photoFrames.length > 0) {
            let photoFrames = albumFrame.photoFrames[0];
            let fileArias = photoFrames.fileArias;
            let extraInfo = photoFrames.extraInfo;
            let metaData = photoMetaDataUtils.getFormattedMetadataKeyAll(fileArias, extraInfo);

            let sentenceText = "";
            let generalInfoText = getInfoMetaDataChecked(
              displaySettings.generalInformation,
              metaData.fileInfos,
              displaySettings.informationName)
            let exifInforText = getInfoMetaDataChecked(
              displaySettings.exifInformation,
              metaData.exifInfos,
              displaySettings.informationName)
            let additionalInfoText = getInfoMetaDataChecked(
              displaySettings.additionalInformation,
              metaData.exifInfos,
              displaySettings.informationName)

            if (generalInfoText.length > 0) {
              if (!displaySettings.informationName) {
                sentenceText = '<<一般的な情報>>\n';
              }
              sentenceText += generalInfoText;
            }
            if (exifInforText.length > 0 || additionalInfoText.length > 0) {
              if (!displaySettings.informationName) {
                sentenceText += '<<付加情報>>\n';
              }
              sentenceText += exifInforText;
              sentenceText += additionalInfoText;
            }

            let defaultText = await layoutInfo.getDefaultText(albumFrame.displayNumber - 1);
            if (defaultText) {
              if (albumFrame.textFrames && albumFrame.textFrames.hasOwnProperty(defaultText.key)) {
                albumFrame.textFrames[defaultText.key].fieldValue = sentenceText;
                albumFrame.textFrames[defaultText.key].richText = {};
              } else {
                albumFrame.textFrames[defaultText.key] =
                  makeTextFrameField(defaultText.key, sentenceText);
              }
              albumFramesArray.push(albumFrame)
            }
          }
        }

        if (albumFramesArray.length === 0) {
          return;
        }

        let canceller = {
          cancel: false
        };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        await goyoAlbumOperation.updateFrames(constructionId, albumId, albumFramesArray, canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
      } catch (e) {
        logger.error('FRAME:MAKE-SENTENCE-FROM-METADATA-ALL', e);
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
  'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL': {
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // Action for 「全画像について工事写真情報を文章にする...」
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
        let yn = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          'この操作の結果、アルバム内の全ての文章が置き換えられますがよろしいですか？',
          'はい(&Y)', 'いいえ(&N)', false);
        if (!yn) {
          return;
        }

        const constructionId = target.constructionId;
        const albumId = target.albumIds[0];

        // get album frames
        let construction = await target.constructionInformation;
        let frameInformations = await bookrackAccessor.getAlbumFrames(constructionId, albumId);

        let [ albumDetail ] = await target.albumDetails;
        let layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumDetail.layout.albumTemplate);

        // get sentence
        const result = await goyoDialog.showPhotoInformationSelectionDialog(parent, construction.knack.knackId, construction.photoInformationTags);
        if (!result) {
          return;
        }

        // confirmination again.
        yn = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '本当に実行してよろしいですか？',
          'はい(&Y)', 'いいえ(&N)', false);
        if (!yn) {
          return;
        }

        // make sentences for all frames.
        let photoInformationMaker = generatePhotoInformationMaker(construction.knack, result, construction.photoInformationTags);

        for (let frame of frameInformations.albumFrames) {
          if (frame.photoFrames.length > 0 && frame.constructionPhotoInformation != null) {
            logger.info(`id: ${frame.albumFrameId}, cpi:${frame.constructionPhotoInformation}`);
            let photoText = photoInformationMaker.make(frame.constructionPhotoInformation);

            let defaultText = await layoutInfo.getDefaultText(frame.displayNumber - 1);
            if (defaultText) {
              if (frame.textFrames.hasOwnProperty(defaultText.key)) {
                frame.textFrames[defaultText.key].fieldValue = photoText;
                frame.textFrames[defaultText.key].richText = {};
              } else {
                frame.textFrames[defaultText.key] = makeTextFrameField(defaultText.key, photoText);
              }
            }
          }
        }

        // do update album frames with progress dialog.
        let canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        await goyoAlbumOperation.updateFrames(constructionId, albumId, frameInformations.albumFrames, canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }

      } catch (e) {
        logger.error('FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL', e);
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
  'FRAME:DELETE-PHOTO-INFORMATION-ALL': {
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // Action for 「全工事写真情報を削除」
      let lockManager = null;
      let holder = holdWindowsStop();
      let progressWindow;
      try {
        // lock album
        lockManager = await lockFactory.makeLockManagerByConstructionId(target.constructionId);
        let locked = await lockManager.lockAlbum(target.albumIds[0], true);
        if (!locked) {
          await goyoDialog.showAlbumLockBusyDialog(parent);
          lockManager = null;
          return;
        }

        let albumDetails = await target.albumDetails;
        let confirm = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          'アルバム「' + albumDetails[0].albumSettings.albumName + '」の工事写真情報を全て削除します。\nよろしいですか？',
          'はい(&Y)',
          'いいえ(&N)',
          false
        );
        if (!confirm) {
          return null;
        }
        confirm = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '質問',
          '本当に削除してよろしいですか？',
          'はい(&Y)',
          'いいえ(&N)',
          false
        );
        if (!confirm) {
          return null;
        }

        const canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        
        let albumFrames = (await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0])).albumFrames;

        for (let index in albumFrames) {
          if (albumFrames[index].constructionPhotoInformation !== null) {
            albumFrames[index].constructionPhotoInformation = {
              '写真情報': {}
            };
          };
        }
        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], albumFrames, canceller,(done,total)=> {
          progressWindow.setProgress(done/total);
        });
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
      } catch (e) {
        logger.error('DELETE-PHOTO-INFORMATION-ALL', e);
        return false;
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
  'FRAME:DELETE-INFORMATIONS-ALL': { // Action for 「全内容を削除」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // TODO: bookrack-accessor will abort in this procedure in rev.4380.
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

        let albumDetails = await target.albumDetails;
        if (albumDetails.length == 0) return;
        let confirm1 = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          `アルバム「${albumDetails[0].albumSettings.albumName}」の内容を全て削除します。\nよろしいですか？`, 'はい(&Y)', 'いいえ(&N)', false);
        if (!confirm1) return;

        let confirm2 = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          `本当に削除してよろしいですか？`, 'はい(&Y)', 'いいえ(&N)', false);
        if (!confirm2) return;

        let canceller = {
          cancel: false
        };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        await goyoAlbumOperation.changeFramesToEmpty(target.constructionId, target.albumIds[0], canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });
        let { bookmarks } = await bookrackAccessor.getBookmarks(target.constructionId, target.albumIds[0]);
        await goyoAlbumOperation.deleteBookmarks(target.constructionId, target.albumIds[0], bookmarks);

      } catch (e) {
        logger.error('error', e);
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
  'FRAME:DELETE-SENTENCE-ALL': { // Action for 「全文章を削除」
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
        
        let albumDetails = await target.albumDetails;
        if (albumDetails.length == 0) return;
        let confirm1 = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          `アルバム「${albumDetails[0].albumSettings.albumName}」の文章を全て削除します。\nよろしいですか？`, 'はい(&Y)', 'いいえ(&N)', false);
        if (!confirm1) return;

        let confirm2 = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '本当に削除してよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
        if (!confirm2) return;

        let canceller = {
          cancel: false
        };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        let {
          albumFrames
        } = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0]);
        albumFrames.forEach(f => {
          if (f.hasOwnProperty('textFrames')) {
            for (let key of Object.keys(f.textFrames)) {
              if (!key.startsWith('kokuban.') && !key.startsWith('visibility.') && !key.startsWith('goyo.')) {
                //f.textFrames[key].fieldValue = '';
                delete f.textFrames[key];
              }
            }
          }
        });

        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], albumFrames, canceller, (done, total) => {
          progressWindow.setProgress(done / total);
        });

      } catch (e) {
        logger.error('error', e);
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
  'FRAME:ROTATE-CROCKWISE': {
    async run(parent, target) {
      // Action for 「フレームの回転右回りに回転」
      unimplemented();
    },
  },
  'FRAME:ROTATE-COUNTERCROCKWISE': {
    async run(parent, target) {
      // Action for 「フレームの回転左回りに回転」
      unimplemented();
    },
  },
  'FRAME:ROTATE-TO-ORIGIN': {
    async run(parent, target) {
      // Action for 「フレームの回転回転を元に戻す」
      unimplemented();
    },
  },
  'FRAME:DELETE': { // Action for 「フレームを削除」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.frameIds.length > 0;
    },
    async run(parent, target) {
      let lockManager = null;
      let isLockAlbumItemdb = false;
      let holder = holdWindowsStop();
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
        await goyoAlbumOperation.deleteFrames(target.constructionId, target.albumIds[0], target.frameIds);
      } catch (e) {
        logger.error('FRAME:DELETE', e);
      } finally {
        if (lockManager != null && isLockAlbumItemdb) {
          // release construction lock
          await lockManager.lockAlbumItemDatabase(false)
          .then(()=>{})
          .catch((e)=>{
            logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
          });
        }
        holder.release();
      }
    },
  },
  'FRAME:INSERT-EMPTY': { // Action for 「フレームを挿入」
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      let waitCursor;
      try {
        waitCursor = waitEffect(parent);
        if (target.frameIds.length > 0) {

          await goyoAlbumOperation.insertEmptyFrames(target.constructionId, target.albumIds[0], 1, target.frameIds[0]);
        } else {
          await goyoAlbumOperation.insertEmptyFrames(target.constructionId, target.albumIds[0], 1);
        }
      } catch (e) {
        logger.error('FRAME:INSERT-EMPTY', e);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
      }
    },
  },
  'FRAME:DELETE-SENTENCE': {
    // Action for 「文章を削除」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.frameIds.length > 0;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let deleteKey = null;
        if (target.textFrame.type === 'key') {
          deleteKey = target.textFrame.key;
        }

        let confirm = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '画像に付属している文章を削除します。\nよろしいですか？',
          'はい(&Y)', 'いいえ(&N)', false
        );
        if (!confirm) {
          return;
        }

        let promises = target.frameIds.map(id => {
          return bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], id)
            .then(f => f.albumFrame)
            .catch(e => null);
        })
        let frames = await Promise.all(promises);
        frames = frames.filter(f => f != null);

        if (deleteKey==null) {
          // remove all sentence keys except for internal used.
          for (let frame of frames) {
            for (let keyStr of Object.keys(frame.textFrames)) {
              if (!keyStr.startsWith('kokuban.') && !keyStr.startsWith('visibility.') && !keyStr.startsWith('goyo.')) {
                delete frame.textFrames[keyStr];
              }
            }
          }
        } else {
          // remove targeted sentence key except for internal used.
          for (let frame of frames) {
            delete frame.textFrames[deleteKey];
          }
        }

        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], frames);
      } catch(e) {
        logger.error('FRAME:DELETE-SENTENCE', e);
      } finally {
        holder.release();
      }
    },
  },
  'FRAME:HIDE-SENTENCE': { // Action for 「文章を表示しない」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      if (target.frameIds.length === 1) {
        let frames = await target.frameInformations;
        if (!frames[0].albumFrame.textFrames.hasOwnProperty('visibility.sentence')) {
          return true;
        }
        return frames[0].albumFrame.textFrames['visibility.sentence'].fieldValue !== 'hide';
      }
      return false;
    },
    async run(parent, target) {
      try {
        let getResult = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
        let frame = getResult.albumFrame;

        if (frame.textFrames.hasOwnProperty('visibility.sentence')) {
          frame.textFrames['visibility.sentence'].fieldValue = 'hide';
        } else {
          frame.textFrames['visibility.sentence'] = makeTextFrameField('visibility.sentence', 'hide');
        }

        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [frame]);
      } catch (error) {
        logger.error('FRAME:HIDE-SENTENCE', error);
      }
    },
  },
  'FRAME:SHOW-SENTENCE': { // Action for 「文章を表示する」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      if (target.frameIds.length === 1) {
        let frames = await target.frameInformations;
        if (frames[0].albumFrame.textFrames.hasOwnProperty('visibility.sentence')) {
          return frames[0].albumFrame.textFrames['visibility.sentence'].fieldValue === 'hide';
        }
      }
      return false;
    },
    async run(parent, target) {
      try {
        let getResult = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
        let frame = getResult.albumFrame;

        if (frame.textFrames.hasOwnProperty('visibility.sentence')) {
          frame.textFrames['visibility.sentence'].fieldValue = 'show';
        } else {
          frame.textFrames['visibility.sentence'] = makeTextFrameField('visibility.sentence', 'show');
        }

        await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [frame]);
      } catch (error) {
        logger.error('FRAME:SHOW-SENTENCE', error);
      }
    },
  },
  'FRAME:EDIT-SENTENCE': {
    // Action for 「文章を編集」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.frameIds.length === 1;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let text = await getTextFrameKeyFormat(target);
        await goyoAlbumOperation.editFrameSettings(parent, target.constructionId, target.albumIds[0], target.frameIds[0], text.key, text.textFormat);
      } catch (e) {
        // ignore exception
      } finally {
        holder.release();
      }
    }
  },
  'FRAME:DELETE-PAGES': { // Action for 「見開き2ページを削除」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.albumIds.length === 1 && typeof target.page === 'number';
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
        // get block count per page.
        let albumDetail = (await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0])).albumDetail;
        let templatePath = path.join(albumDetail.layout.albumTemplate, 'albumtemplateG.json');
        let template = JSON.parse(await fse.readFile(templatePath, 'utf-8'));
        let blockCount = template.leftPageBlockCount + template.rightPageBlockCount;

        // Get an id of a first frame which will be removed.
        let frameIndex = (blockCount * Math.floor((target.page - 1) / 2));
        let getResult = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0], frameIndex, blockCount);

        if (getResult.albumFrames.some(f => f.photoFrames.length > 0)) {
          let confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent, 'フレーム削除確認', 'ページ数を減らすと、いくつかの画像が削除されます。\nよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
          if (!confirm) return;
          confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent, 'フレーム削除確認', '本当に実行してよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
          if (!confirm) return;
        }
        waitCursor = waitEffect(parent);
        let frameIds = getResult.albumFrames.map(f => f.albumFrameId);
        await goyoAlbumOperation.deleteFrames(target.constructionId, target.albumIds[0], frameIds);
      } catch (e) {
        logger.error('FRAME:DELETE-PAGES', e);
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
  'FRAME:INSERT-PAGES': { // Action for 「見開き２ページを挿入」
    runnableWhileSharedLock : true,    
    async isRunnable(type, target) {
      return target.albumIds.length === 1 && typeof target.page === 'number';
    },
    async run(parent, target) {
      let waitCursor;
      try {
        waitCursor = waitEffect(parent);
        // get block count per page.
        let albumDetail = (await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0])).albumDetail;
        let templatePath = path.join(albumDetail.layout.albumTemplate, 'albumtemplateG.json');
        let template = JSON.parse(await fse.readFile(templatePath, 'utf-8'));
        let blockCount = template.leftPageBlockCount + template.rightPageBlockCount;

        // get an id of a first frame which will be moved by inserting pages.
        let frameIndex = (blockCount * Math.floor((target.page - 1) / 2));
        let getResult = await bookrackAccessor.getAlbumFrames(target.constructionId, target.albumIds[0], frameIndex, 1);
        let targetId = getResult.albumFrames[0].albumFrameId;

        await goyoAlbumOperation.insertEmptyFrames(target.constructionId, target.albumIds[0], blockCount, targetId);
      } catch (e) {
        logger.error('FRAME:INSERT-PAGES', e);
      } finally {
        if(waitCursor) {
          waitCursor.release();
        }
      }
    },
  },
  'FRAME:ADD-PHOTO-TO-RESERVED-FRAME': { // Action for 「予約フレームへ画像を登録...」
    runnableWhileSharedLock : true,    
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

        let getResult = await bookrackAccessor.getAlbumFrame(target.constructionId, target.albumIds[0], target.frameIds[0]);
        let originalFrame = getResult.albumFrame;

        // show dialog.
        let fileList = await goyoDialog.showOpenFileSelectionDialog(parent,
          goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, undefined,
          goyoAppDefaults.inputFileFilter, false);

        waitCursor = waitEffect(parent);
        // make album frames
        let albumDetailResult = await bookrackAccessor.getAlbumDetail(target.constructionId, target.albumIds[0]);
        let newAlbumFrames = await goyoAlbumOperation.makeAlbumFrames(fileList, 'Album', albumDetailResult.albumDetail);

        if (newAlbumFrames.length > 0) {
          let newAlbumFrame = newAlbumFrames[0];

          // parameter update
          newAlbumFrame.albumFrameId = originalFrame.albumFrameId;
          newAlbumFrame.referenceSouceAlbumFrameId = originalFrame.referenceSouceAlbumFrameId;
          newAlbumFrame.referenceDiagramFilePath = originalFrame.referenceDiagramFilePath;
          newAlbumFrame.photoFrames[0].photoFrameId = originalFrame.photoFrames[0].photoFrameId;

          // parameter update (constructionPhotoInformation)
          if (originalFrame.constructionPhotoInformation) {
            Object.assign(newAlbumFrame.constructionPhotoInformation, originalFrame.constructionPhotoInformation);
          }

          // parameter update (textFrames)
          if (originalFrame.textFrames) {
            Object.assign(newAlbumFrame.textFrames, originalFrame.textFrames);
          }

          //logger.debug('newAlbumFrame.textFrames');
          //logger.debug(newAlbumFrame.textFrames);
          //logger.debug('originalFrame.textFrames');
          //logger.debug(originalFrame.textFrames);
          //logger.debug(`update: frameId=${newAlbumFrame.albumFrameId} file=${path.basename(newAlbumFrame.photoFrames[0].imageFile)}`);
          logger.debug('newAlbumFrame.photoFrames');
          logger.debug(newAlbumFrame.photoFrames);
          await goyoAlbumOperation.updateFrames(target.constructionId, target.albumIds[0], [newAlbumFrame]);
        }
      } catch (e) {
        logger.error('FRAME:ADD-PHOTO-TO-RESERVED-FRAME', e);
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
};


function makeTextFrameField(key, value, label = "") {
  return {
    fieldKey: key,
    fieldValue: value,
    fieldLabel: label,
    hideSentence: 0,
    hideSentenceBackground: 0,
  };
}

async function getTextFrameKeyFormat(target, frameIndex=null) {
  let result = { key: null, textFormat: null };
  if (target.textFrame.type === 'default') {
    if (frameIndex==null) {
      if (target.frameIds.length === 0) {
        return result;
      }
      frameIndex = (await target.frameInformations)[0].albumFrame.displayNumber - 1;
    }
    
    let albumDetails = await target.albumDetails;
    let layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumDetails[0].layout.albumTemplate);
    let defaultText =  await layoutInfo.getDefaultText(frameIndex);
    if (defaultText) {
      result = {
        key: defaultText.key,
        textFormat: defaultText.textFormat,
      };
      if (defaultText.matchTextFormat!=null) {
        let textFrames = (await target.frameInformations)[0].albumFrame.textFrames;
        if ((await layoutInfo.detectKokubanMatching(textFrames))=='match') {
          result.textFormat = defaultText.matchTextFormat;
        }
      }
    }
  } else if (target.textFrame.type === 'key') {
    result = {
      key: target.textFrame.key,
      textFormat: target.textFrame.format,
    };
  }
  return result;
}

function textFrameIsEmpty(textFrames, key) {
  if (!textFrames.hasOwnProperty(key)) {
    return true;
  } else if (textFrames[key].richText && textFrames[key].richText.ops) {
    return false;
  } else {
    return textFrames[key].fieldValue === '';
  }
}

function getInfoMetaDataChecked(keysCheck, keysValue, informationName) {
  let infoMetaDataChecked = []
  var sentenceText = "";
  for (let key of Object.keys(keysCheck)) {
    if (keysCheck[key] > 0) {
      let value = null;
      let label = null;
      if (keysValue.hasOwnProperty(key)) {
        label = keysValue[key][0],
          value = keysValue[key][1]
        if (!informationName) {
          sentenceText += `【${label}】`.padEnd(30) + value + '\n';
        } else {
          sentenceText += value + '\n';
        }
      }
      infoMetaDataChecked[key] = [label, value]
    }
  };

  return sentenceText;
}

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

module.exports = actions;
