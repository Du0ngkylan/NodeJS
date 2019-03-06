'use strict';

// Node.js modules.
const path = require('path');
const fs = require('fs');

// application defaults
const GOYOLCS_DATA = Buffer.from([85,60,4,30,162,226,197,90,167,207,114,104,53,242,197,91,68,62,46,163,202,178,152,155,217,2,212,31,244,177,151,184,60,242,121,248,15,19,14,87,84,189,81,171,181,117,249,240,136,243,66,37,194,154,88,89,166,241,148,146,60,144,227,241]);
const GOYOPRODUCT = 'PRODUCT';
const GOYOTRIAL   = 'TRIAL';
const _GOYO_SUPPORT_NAME = 'くらえもん☆オンライン';
const _GOYO_SUPPORT_PHONE_NUMBER = '03-4500-6702';
const _GOYO_SUPPORT_CONTACT_ACTION = 'ご連絡ください。';
module.exports = {
  get GOYO_SUPPORT_NAME(){
    return _GOYO_SUPPORT_NAME;
  },
  get GOYO_SUPPORT_PHONE_NUMBER(){
    return _GOYO_SUPPORT_PHONE_NUMBER;
  },
  get GOYO_SUPPORT_CONTACT_ACTION(){
    return _GOYO_SUPPORT_CONTACT_ACTION;
  },
  get TRIAL_MAX_CONSTRUCTIONS() {
    return 3;
  },
  get TRIAL_MAX_FRAMES_IN_ALBUM() {
    return 100;
  },
  get TRIAL_MAX_DATASIZE_IN_CONSTRUCTION() {
    return 500*1024*1024;
  },
  get PRODUCT_NAME() {
    return '蔵衛門御用達2020';
  },
  get APPLICATION_TYPE() {
    if (this._applicationType == null) {
      this._applicationType = getApplicationType();
    }
    return this._applicationType;
  },
  get VERSION() {
    let ver = require('../package.json').version;
    return ver.replace(/\+\w*/, '');
  },

  get createAlbumSettings() {
    if(!Object.isFrozen(this.createAlbumSettingsObj)) {
      deepFreeze(this.createAlbumSettingsObj)
    }
    return this.createAlbumSettingsObj;
  },
  get isTrial(){
    if (this._applicationType == null) {
      this._applicationType = getApplicationType();
    }
    return this._applicationType === GOYOTRIAL;
  },

  DIALOG_TITLE : '蔵衛門御用達',

  DIALOG_INPUT_FILE_TITLE : '画像ファイルを読み込み',
  DIALOG_INPUT_EXCEL_TITLE : 'Excelファイルを読み込み',
  DIALOG_SAVE_EXCEL_TITLE : 'Excelファイルを保存',
  DIALOG_SAVE_OTHER_TITLE : '別名で保存',
  DIALOG_SAVE_FOLDER_TITLE : 'フォルダを参照',
  DIALOG_RESTORE_FILE_TITLE:'本棚のバックアップを読み込み',
  inputFileFilter : [
    // XXX: 'tif', 'tiff' TIF supports only reference diagram if necessary
    {name: '画像ファイル', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif']},
    {name: 'すべてのファイル', extensions: ['*']}
  ],
  inputExcelFilter : [
    {name: 'Excelファイル', extensions: ['xls', 'xlsx']}
  ],
  outputFileFilter : [
    {name : 'BMP(Windows Bitmap)', extensions: ['bmp']},
    {name : 'PNG(Portable Network Graphics)', extensions: ['png']},
    {name : 'JPG(Exif JPEG)', extensions: ['jpg']},
    {name : 'GIF(Graphics Interchange Format)', extensions: ['gif']},
  ],
  restoreFileFilter : [
    {name: 'BKSX(本棚のバックアップ)',extensions:['bksx']}
  ],
  // XXX: 'tif', 'tiff' TIF supports only reference diagram if necessary
  SUPPORT_IMAGE_EXTENSIONS: [ '.bmp', '.jpg', '.jpeg', '.gif', '.png'],

  MAX_ADD_PHOTO_FILES : 253,
  MAX_RECURSIVE_DIRS : 2,

  createAlbumSettingsObj : {
    "albumName": "新しいアルバム",
    "bookCoverOption": {
      "bookCoverColorType": 0,
      "displayNameAndImage": 0,
      "displayPasswordKeyMark": 0,
      "photoInformationIcon": 0,
      "font": {
        "fontBinary": "f0ffffff0000000000000000000000009001000000000080030201324d0065006900720079006f0020005500490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "fontName": "Meiryo UI",
        "fontSize": 12,
        "fontStyle": "",
        "fontWeight": 400,
        "textDecoration": "",
        "fontColor" : ""
      },
      "horizontalName": 0,
      "reducedImage": 0,
      "thicknessByPage": 1,
      "frontImagePosition": 1,
      "reducedImagePosition": 1,
    },
    "clickType": 0,
    "displayOption": {
      "focus": 0,
      "icon": 1,
      "pageNumber": 0,
      "slider": 0
    },
    "initialAlbumNumber": 1,
    "initialPageNumber": 6,
    "matDesign": {
      "matType": 6
    },
    "photoInfoTemplate": {
      "largeClassification": "",
      "photoClassification": "",
      "constructionType": "",
      "middleClassification": "",
      "smallClassification": ""
    },
    "pagingDirection": 0,
    "reducedImage": {
      "jpegQuality": 100,
      "reducedImageType": 1
    },
    "sentence": {
      "displayType": 1,
      "font": {
        "fontBinary": "f1ffffff0000000000000000000000009001000000000080030201324d0065006900720079006f0020005500490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "fontName": "Meiryo UI",
        "fontSize": 11,
        "fontStyle": "",
        "fontWeight": 400,
        "textDecoration": ""
      },
    },
  },
};

function deepFreeze(o) {
  Object.freeze(o);
  for (let propKey in o) {
    let prop = o[propKey];
    if (!o.hasOwnProperty(propKey) || !(typeof prop === "object") || Object.isFrozen(prop)) {
      continue;
    }
    deepFreeze(prop);
  }
}


function getApplicationType() {
  try {
    let data = fs.readFileSync(path.join(process.cwd(), 'GOYOLCS'));
    if (data.equals(GOYOLCS_DATA)) {
      return GOYOPRODUCT;
    }
  } catch(e) {
    // ignore.
  }

  try {
    let data = fs.readFileSync(path.join(path.dirname(process.argv[0]), 'GOYOLCS'));
    if (data.equals(GOYOLCS_DATA)) {
      return GOYOPRODUCT;
    }
  } catch(e) {
    // ignore.
  }

  return GOYOTRIAL;
}
