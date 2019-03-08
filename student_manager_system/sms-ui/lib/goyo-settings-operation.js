'use strict';

// Node.js modules.
const EventEmitter = require('events');
const path = require('path');

// Electron modules.
const { app } = require('electron');

// 3rd-parth modules.
const fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppFolder = require('./goyo-appfolder');


var settingsOperation = {
  editProgramSetting: async function (parent) {
    // Please catch an exceptions by caller of this function.

    let currentSetting = await bookrackAccessor.getProgramSettings();
    let newSetting = await goyoDialog.showProgramSettingDialog(parent, currentSetting);

    if (!newSetting) { // Do nothing if users clicked 'cancel'.
      return false;
    }

    if (newSetting.programSettings.dataManagement.rootFolder !== currentSetting.programSettings.dataManagement.rootFolder) {
      let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent, "質問", "本当に、基本フォルダを" + oldSetting.programSettings.dataManagement.rootFolder +
        "\nに移動してよろしいですか?\n\n" + "　　《注意》\n" + "　　外付けHDDを指定する場合は常に同じドライブ名で\n" + "　　接続されている必要があります。",
        "はい", "いいえ", true);
      if (!result) {
        newSetting.programSettings.dataManagement.rootFolder = currentSetting.programSettings.dataManagement.rootFolder;
      }
    }
    await bookrackAccessor.updateProgramSettings(newSetting);
    // let result = await bookrackAccessor.setProgramSettings(bookrackId, albumId);
    return true;
  },

  editBookrackSetting: async function (parent, constructionId) {
    // Please catch an exceptions by caller of this function.

    let currentSetting = await bookrackAccessor.getBookrackSettings(constructionId);

    let newSetting = await goyoDialog.showBookrackSettingDialog(parent, currentSetting);
    if (!newSetting) { // Do nothing if users clicked 'cancel'.
      return false;
    }

    await bookrackAccessor.updateBookrackSettings(newSetting, constructionId);

    return true;
  },

  editAlbumDetailSetting: async function (parent, constructionId, albumId) {
    // Please catch an exceptions by caller of this function.

    let currentSetting = await bookrackAccessor.getAlbumDetail(constructionId, parseInt(albumId));

    let newSetting = await goyoDialog.showAlbumSettingDialog(parent, currentSetting);
    if (!newSetting) { // Do nothing if users clicked 'cancel'.
      return false;
    }

    if (typeof newSetting.bookCoverOption.bookCoverColorType === 'number') {
      let covers = await prepareNewBookCoverFiles(newSetting.bookCoverOption.bookCoverColorType);
      Object.assign(newSetting.bookCoverOption, covers);
    }

    await bookrackAccessor.updateAlbumSettings(constructionId, parseInt(albumId), newSetting);
    this.emit('changeAlbumSetting', constructionId, albumId);

    if (typeof newSetting.bookCoverOption.bookCoverColorType === 'number') {
      clearnBookCoverFiles();
    }

    return true;
  },

  editPhotoInformation: async function(parent, constructionId, albumId, frameId) {
    // Please catch an exceptions by caller of this function.

    let constructionInfo = await bookrackAccessor.getConstructions(constructionId);
    if (!constructionInfo.constructions instanceof Array || constructionInfo.constructions.length<1) { return false; }
    let knack = constructionInfo.constructions[0].knack;

    let frameInfo = await bookrackAccessor.getAlbumFrames(constructionId, parseInt(albumId));
    if (!frameInfo.albumFrames instanceof Array || frameInfo.albumFrames.length<1) { return false; }

    let newSetting = await goyoDialog.showPhotoInformationDialog(parent, knack, frameInfo.albumFrames[frameId], frameInfo.albumFrames);
    if (!newSetting) { // Do nothing if users clicked 'cancel'.
      return false;
    }

    //await bookrackAccessor.updateAlbumSettings(constructionId, parseInt(albumId), newSetting);
    return true;
  },

  editFrameInformationSetting: async function (parent, constructionId, albumId, frameId) {

    let frameInfo = await bookrackAccessor.getAlbumFrames(constructionId, parseInt(albumId), frameId, 1);

    let newSetting = await goyoDialog.showFrameInformationDialog(parent, { frame: frameInfo });
    if (!newSetting) { // Do nothing if users clicked 'cancel'.
      return false;
    }
    return true;
  },

}

Object.setPrototypeOf(settingsOperation, EventEmitter.prototype);
module.exports = settingsOperation;


async function prepareNewBookCoverFiles(colorType) {

  const files = [
    'aa_7.jpg',
    'aa_6.jpg',
    'aa_9.jpg',
    'aa_10.jpg',
    'aa_11.jpg',
    'aa_8.jpg',
    'aa_0.jpg',
    'aa_1.jpg',
    'aa_2.jpg',
    'aa_3.jpg',
    'aa_4.jpg',
    'aa_5.jpg',
    'ac_0.jpg',
    'ac_1.jpg',
    'ac_2.jpg',
    'ac_3.jpg',
    'ac_4.jpg',
    'ac_5.jpg',
    'ac_6.jpg',
    'ac_7.jpg',
    'ac_8.jpg',
    'ac_9.jpg',
    'atom_076.jpg',
    'atom_077.jpg',
    'atom_078.jpg',
    'atom_079.jpg',
    'atom_098.jpg',
    'atom_099.jpg',
  ];

  const resourceFolder = path.join( __dirname, '..', 'resources', 'COVER');
  
  // covers
  let f = files[colorType];
  let srcFront = path.join(resourceFolder, 'FRONT', f);
  let srcBack  = path.join(resourceFolder, 'BACK', f);
  let srcSpine = path.join(resourceFolder, 'SPINE', f);

  let tempDir = app.getPath('temp');
  let frontCover = path.join(tempDir, '@FrCvr@');
  let backCover = path.join(tempDir, '@BkCvr@');
  let spineCover = path.join(tempDir, '@SpCvr@');

  await fse.copy(srcFront, frontCover);
  await fse.copy(srcBack, backCover);
  await fse.copy(srcSpine, spineCover);

  return { frontCover, backCover, spineCover };
}

async function clearnBookCoverFiles(covers) {
  await fse.remove(covers.frontCover);
  await fse.remove(covers.backCover);
  await fse.remove(covers.spineCover);
}




