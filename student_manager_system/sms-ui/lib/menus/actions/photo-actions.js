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

const actions = {
  ///////////////////////////////////////////////////////////////////
  // Photo
  ///////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////
  // Photo view
  ///////////////////////////////////////////////////////////////////

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
