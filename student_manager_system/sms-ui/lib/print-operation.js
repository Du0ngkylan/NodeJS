'use strict';

// Node.js modules.
const EventEmitter = require('events');

// Electron modules.
const {
  BrowserWindow
} = require('electron');

// Goyo modules.
const windowHandler = require('./window-controller/window-handler');
const bookrackAccessor = require('goyo-bookrack-accessor');
const GeneralWindowSet = require('./window-controller/general-windowset');
const goyoAlbumOperation = require('./goyo-album-operation');
const goyoAlbumLayout = require('./layout/goyo-album-layout');
const programSettings = require('./goyo-program-settings');
const devMode = require('./devmode-utils');
const generatePhotoInformationMaker = require('./photo-information-text').generatePhotoInformationMaker;
const goyoDialog = require('./goyo-dialog-utils');
const { holdWindowsStop } = require('./goyo-utils');
const licenseManager = require('./license/goyo-license-manager');
const goyoAppDefaults = require('./goyo-app-defaults');
const logger = require('./goyo-log')('print-operation');
const lockFactory= require('./lock-manager/goyo-lock-manager');

// Constant values.
const TRIAL_FOOTER = {
  enable: 1,
  size: 50,
  left: '',
  center: `${goyoAppDefaults.PRODUCT_NAME} 体験版`,
  right: '',
};

class PrintSetting {
  constructor(printSettings, textMode) {
    this.printSettings = printSettings;
    this._textMode = textMode;
  }

  updateOrientation(orientation) {
    let newPrinterSetting = devMode.updateOrientation(orientation, this.printSettings.printerSettings);
    this.printSettings.printerSettings = newPrinterSetting;
  }

  get textMode() {
    return this._textMode;
  }
  set textMode(v) {
    this._textMode = v;
  }

  async ControlFrameText(param) {
    if (param) {
      this.printSettings.printLayoutSettings.text.enable = 1;
    } else {
      this.printSettings.printLayoutSettings.text.enable = 0;
    }
  }
}

class PrintPaperGenerator {
  constructor() {
    this.paperSelections = [
      {key: 1,label: 'Letter'},
      {key: 2,label: 'Letter Small'},
      {key: 3,label: 'Tabloid'},
      {key: 4,label: 'Ledger'},
      {key: 5,label: 'Legal'},
      {key: 6,label: 'Statement'},
      {key: 7,label: 'Executive'},
      {key: 8,label: 'A3'},
      {key: 9,label: 'A4'},
      {key: 10,label: 'A4'},
      {key: 11,label: 'A5'},
      {key: 12,label: 'B4 (JIS)'},
      {key: 13,label: 'B5 (JIS)'},
      {key: 14,label: 'Folio'},
      {key: 15,label: 'Quarto'},
      {key: 16,label: '10x14 in'},
      {key: 17,label: '11x17 in'},
      {key: 18,label: 'Note'},
      {key: 19,label: 'Envelope #9'},
      {key: 20,label: 'Envelope #10'},
      {key: 21,label: 'Envelope #11'},
      {key: 22,label: 'Envelope #12'},
      {key: 23,label: 'Envelope #14'},
      {key: 24,label: 'C size sheet'},
      {key: 25,label: 'D size sheet'},
      {key: 26,label: 'E size sheet'},
      {key: 27,label: 'Envelope DL'},
      {key: 28,label: 'Envelope C5'},
      {key: 29,label: 'Envelope C3'},
      {key: 30,label: 'Envelope C4'},
      {key: 31,label: 'Envelope C6'},
      {key: 32,label: 'Envelope C65'},
      {key: 33,label: 'Envelope B4'},
      {key: 34,label: 'Envelope B5'},
      {key: 35,label: 'Envelope B6'},
      {key: 36,label: 'Envelope'},
      {key: 37,label: 'Envelope Monarch'},
      {key: 38,label: '6 3/4 Envelope'},
      {key: 39,label: 'US Std Fanfold'},
      {key: 40,label: 'German Std Fanfold'},
      {key: 41,label: 'German Legal Fanfold'},
      {key: 42,label: 'B4 (ISO)'},
      {key: 43,label: 'Japanese Postcard'},
      {key: 44,label: '9 x 11 in'},
      {key: 45,label: '10 x 11 in'},
      {key: 46,label: '15 x 11 in'},
      {key: 47,label: 'Envelope Invite'},
      {key: 48,label: 'RESERVED--DO NOT USE'},
      {key: 49,label: 'RESERVED--DO NOT USE'},
      {key: 50,label: 'Letter Extra'},
      {key: 51,label: 'Legal Extra'},
      {key: 52,label: 'Tabloid Extra'},
      {key: 53,label: 'A4 Extra'},
      {key: 54,label: 'Letter Transverse'},
      {key: 55,label: 'A4 Transverse'},
      {key: 56,label: 'Letter Extra Transverse'},
      {key: 57,label: 'SuperA/SuperA/A4'},
      {key: 58,label: 'SuperB/SuperB/A3'},
      {key: 59,label: 'Letter Plus'},
      {key: 60,label: 'A4 Plus'},
      {key: 61,label: 'A5 Transverse'},
      {key: 62,label: 'B5 (JIS) Transverse'},
      {key: 63,label: 'A3 Extra'},
      {key: 64,label: 'A5 Extra'},
      {key: 65,label: 'B5 (ISO)'},
      {key: 66,label: 'A2'},
      {key: 67,label: 'A3 Transverse'},
      {key: 68,label: 'A3 Extra Transverse'},
      {key: 69,label: 'Japanese Double Postcard'},
      {key: 70,label: 'A6'},
      {key: 71,label: 'Japanese Envelope Kaku #2'},
      {key: 72,label: 'Japanese Envelope Kaku #3'},
      {key: 73,label: 'Japanese Envelope Chou #3'},
      {key: 74,label: 'Japanese Envelope Chou #4'},
      {key: 75,label: 'Letter Rotated'},
      {key: 76,label: 'A3 Rotated'},
      {key: 77,label: 'A4 Rotated'},
      {key: 78,label: 'A5 Rotated'},
      {key: 79,label: 'B4 (JIS) Rotated'},
      {key: 80,label: 'B5 (JIS) Rotated'},
      {key: 81,label: 'Japanese Postcard Rotated'},
      {key: 82,label: 'Double Japanese Postcard Rotated'},
      {key: 83,label: 'A6 Rotated'},
      {key: 84,label: 'Japanese Envelope Kaku #2 Rotated'},
      {key: 85,label: 'Japanese Envelope Kaku #3 Rotated'},
      {key: 86,label: 'Japanese Envelope Chou #3 Rotated'},
      {key: 87,label: 'Japanese Envelope Chou #4 Rotated'},
      {key: 88,label: 'B6 (JIS)'},
      {key: 89,label: 'B6 (JIS) Rotated'},
      {key: 90,label: '12 x 11 in'},
      {key: 91,label: 'Japanese Envelope You #4'},
      {key: 92,label: 'Japanese Envelope You #4 Rotated'},
      {key: 93,label: 'PRC 16K'},
      {key: 94,label: 'PRC 32K'},
      {key: 95,label: 'PRC 32K(Big)'},
      {key: 96,label: 'PRC Envelope #1'},
      {key: 97,label: 'PRC Envelope #2'},
      {key: 98,label: 'PRC Envelope #3'},
      {key: 99,label: 'PRC Envelope #4'},
      {key: 100,label: 'PRC Envelope #5'},
      {key: 101,label: 'PRC Envelope #6'},
      {key: 102,label: 'PRC Envelope #7'},
      {key: 103,label: 'PRC Envelope #8'},
      {key: 104,label: 'PRC Envelope #9'},
      {key: 105,label: 'PRC Envelope #10'},
      {key: 106,label: 'PRC 16K Rotated'},
      {key: 107,label: 'PRC 32K Rotated'},
      {key: 108,label: 'PRC 32K(Big) Rotated'},
      {key: 109,label: 'PRC Envelope #1 Rotated'},
      {key: 110,label: 'PRC Envelope #2 Rotated'},
      {key: 111,label: 'PRC Envelope #3 Rotated'},
      {key: 112,label: 'PRC Envelope #4 Rotated'},
      {key: 113,label: 'PRC Envelope #5 Rotated'},
      {key: 114,label: 'PRC Envelope #6 Rotated'},
      {key: 115,label: 'PRC Envelope #7 Rotated'},
      {key: 116,label: 'PRC Envelope #8 Rotated'},
      {key: 117,label: 'PRC Envelope #9 Rotated'},
      {key: 118,label: 'PRC Envelope #10 Rotated'},
    ];
  }

  getNameofPrintSize(size) {
    let paperSizeName = '';
    for (let paperSelection of this.paperSelections) {
      if (size === paperSelection.key) {
        paperSizeName = paperSelection.label;
      }
    }
    return paperSizeName;
  }
}

function getDevmodeInformation(wcPrinters, printerSetting) {
  let pInfo;

  if (printerSetting.deviceMode && printerSetting.deviceNames) {
    try {
      pInfo = new devMode.PrintSetting(printerSetting.deviceMode, printerSetting.deviceNames);
    } catch(e) {
      //logger.info(`could not load printer info: ${printerSetting.deviceNames}`);
      logger.error(`could not load printer info:`, e);
      // ignore.
    }
  } else {
    logger.info(`no printer set in this construction.`);
  }

  if (pInfo && wcPrinters.some(p => p.name === pInfo.deviceName)) {
    return pInfo;
  }

  try {
    return devMode.getDefaultPrintSetting();
  } catch(e) {
    logger.error(`could not load default printer`, e);
    return null;
  }
}

module.exports = {
  currentContext: null,
  printPaperGenerator: new PrintPaperGenerator(),
  printSetting: null,
  lockManager: null,
  devmodeInformation: null,

  startPreview: async function (parent, constructionId, albumId, textMode, frameIds=null) {
    if (this.currentContext) {
      // This window allows only one instance at a time.
      // return null if it has one instance already.
      await goyoDialog.showSimpleMessageDialog(
        parent,
        '工事写真台帳印刷',
        '印刷ダイアログを重複して開くことはできません。先に起動しているダイアログを終了してから再度操作してください。',
        'OK');
      return null;
    }

    let holder = holdWindowsStop();
    try {
      let wcPrinters = parent.webContents.getPrinters();
      if (wcPrinters.length == 0) {
        await goyoDialog.showErrorMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '利用可能なプリンタデバイスが見つかりません', 'OK');
        return null;
      }

      this.currentContext = { constructionId, albumId };

      // lock album
      this.lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
      let locked = await this.lockManager.lockAlbum(albumId, true);
      if (!locked) {
        this.currentContext = null;
        await goyoDialog.showAlbumLockBusyDialog(parent);
        return null;
      }  

      let ci = await bookrackAccessor.getConstructionDetail(constructionId);
      let cs = await bookrackAccessor.getConstructionSettings(constructionId);
      let knack = ci.construction.knack;
      let constructionPhoto = cs.constructionSettings.constructionPhoto;
      let photoInformationTags = ci.construction.photoInformationTags;
      this.photoInfoMakerParamters = {
        knack, constructionPhoto, photoInformationTags,
      };

      let albumInformation = await bookrackAccessor.getAlbumDetail(constructionId, parseInt(albumId));
      if (albumInformation.albumDetail.dataFolderInformation.imageFileTotalCount === 0) {
        this.currentContext = null;
        await goyoDialog.showErrorMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          'このアルバムには利用できる画像が1枚もありません。', 'OK');
        return null;
      }

      albumInformation = await goyoAlbumLayout.checkLayoutUpdate(bookrackAccessor, constructionId, albumId, albumInformation);

      let printSetData = await bookrackAccessor.getPrintSettings(constructionId, parseInt(albumId));
      this.devmodeInformation = getDevmodeInformation(wcPrinters, printSetData.printerSettings);
      if (this.devmodeInformation==null) {
        this.currentContext = null;
        await goyoDialog.showErrorMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '利用可能なプリンタデバイスが見つかりません', 'OK');
        return;
      }

      let albumFrames;
      let mode;
      if (frameIds instanceof Array) {
        //albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, parseInt(albumId))).albumFrames;
        let promises = frameIds.map((frameId, i) => {
          return goyoAlbumOperation.getAlbumFrame(constructionId, parseInt(albumId), frameId)
            .then(result => result.albumFrame)
            .catch(e => logger.error(`could not get album frame ${frameId}`, e));
        });
        albumFrames = await Promise.all(promises);
        mode = 'filtered';
      } else {
        albumFrames = (await goyoAlbumOperation.getAlbumFrames(constructionId, parseInt(albumId))).albumFrames;
        mode = 'normal';
      }

      if (licenseManager.licenseType === 'trial') {
        printSetData.printDecorationSettings.footer = TRIAL_FOOTER;
      }

      this.currentContext.layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumInformation.albumDetail.layout.albumTemplate);
      let template = await this.currentContext.layoutInfo.template;
      if (this.currentContext.layoutInfo.type==='ordermade') {
        Object.assign(printSetData.printDecorationSettings.padding, template.defaultMargins);
      }
      //printSetData.printDecorationSettings.textMode = textMode;
      printSetData.printDecorationSettings.shootingDate = programSettings.displayImage.shootingDate.displayDate;
      useMinimumPadding(printSetData.printDecorationSettings.padding, this.devmodeInformation);
      this.printSetting = new PrintSetting(printSetData, textMode);

      this.currentContext.albumFrames = albumFrames;
      this.currentContext.mode = mode;
      this.currentContext.albumInformation = albumInformation;
      this.currentContext.albumTemplate = template;
      this.currentContext.previewWin = await windowHandler.openPrintPreviewWindow(null);
      this.currentContext.previewWin.show();
      this.currentContext.previewWin.on('close', () => {
        GeneralWindowSet.deleteWindowId(this.currentContext.previewWin.id);
        if (this.lockManager != null) {
          this.lockManager.lockAlbum(albumId, false)
            .then(() => {})
            .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)}); 
          this.lockManager = null;
        }
        this.currentContext = null;
      });

      GeneralWindowSet.putWindowId(this.currentContext.previewWin.id);
      return this.currentContext.previewWin;
    } catch(e) {
      logger.error('startPreview', e);
      if (this.lockManager != null) {
        this.lockManager.lockAlbum(albumId, false)
          .then(() => {})
          .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)}); 
        this.lockManager = null;
      }

      this.currentContext = null;
      return null;
    } finally {
      holder.release();
    }
  },

  async updatePrintSettings(constructionId, albumId, newDecoration=null, newLayout=null, newPrinter=null) {
    if (newDecoration || newLayout || newPrinter) {
      let setting = await bookrackAccessor.getPrintSettings(constructionId, albumId);

      if (newDecoration) {
        setting.printDecorationSettings = newDecoration;
      }
      if (newLayout) {
        setting.printLayoutSettings = newLayout;
      }
      if (newPrinter) {
        setting.printerSettings = newPrinter;
      }

      let updateResult = await bookrackAccessor.updatePrintSettings(constructionId, albumId, setting);
      logger.info(updateResult);

      this.emit('change-print-settings', constructionId, albumId);
    }
  },

  async editPrintDecoration(parent, templatePath) {
    /*
     * This function is for editting print decoration setting.
     * but two special features exist.
     *
     *  1. For 'trial' version,  replace footer setting.
     *     not change footer setting for backend, but show TRIAL_FOOOTER for UI.
     *  2. For 'ordermade' template,  replace padding.
     *     not change padding for backend data, but show template-defined-padding for UI.
     */
    let setting = await bookrackAccessor.getPrintSettings(this.currentContext.constructionId, this.currentContext.albumId);
    let oldPadding;

    if (this.currentContext && this.currentContext.layoutInfo && this.currentContext.layoutInfo.type==='ordermade') {
      oldPadding = setting.printDecorationSettings.padding;
      setting.printDecorationSettings.padding = this.printSetting.printSettings.printDecorationSettings.padding;
    }
    setting.printDecorationSettings.shootingDate = this.printSetting.printSettings.printDecorationSettings.shootingDate;

    let result = await goyoDialog.showPrintDecorationSettingDialog(parent, {
      decoration: setting.printDecorationSettings,
      mode: licenseManager.licenseType,
      paperWidth: this.devmodeInformation.paperWidth,
      paperHeight: this.devmodeInformation.paperHeight,
      templatePath: templatePath,
    });

    if (result) {
      result = JSON.parse(JSON.stringify(result));
      let newPadding = result.padding;
      if (oldPadding) {
        result.padding = oldPadding;
      } else {
        useMinimumPadding(result.padding, this.devmodeInformation);
      }

      await this.updatePrintSettings(this.currentContext.constructionId, this.currentContext.albumId, result, null, null);

      if (licenseManager.licenseType === 'trial') {
        result.footer = TRIAL_FOOTER;
      }
      result.padding = newPadding;
      useMinimumPadding(result.padding, this.devmodeInformation);
      this.printSetting.printSettings.printDecorationSettings = result;
    }

    return result;
  },

  async editPrinterSetting(parent) {
    try {
      let nativeParent = parent.getNativeWindowHandle();
      let result = await devMode.showPrintDialog(nativeParent, this.devmodeInformation);
      if (result) {
        let beforeOrientation = this.devmodeInformation.orientation;
        let newPrinter = {
          deviceMode: result.devmode.toString('hex'),
          deviceNames: result.devname.toString('hex'),
          orientation: (result.orientation==='PORTRAIT') ? 1 : 2,
          paper: this.printPaperGenerator.getNameofPrintSize(result.paperSize),
        };
        if(beforeOrientation !== result.orientation) {
          await this.rotatePadding(result.orientation);
        }
        await this.updatePrintSettings(this.currentContext.constructionId, this.currentContext.albumId, null, null, newPrinter);
        this.devmodeInformation = result;
      }
      return result;
    } catch(e) {
      logger.error('editPrinterSetting', e);
      await goyoDialog.showErrorMessageDialog(
        parent, goyoAppDefaults.DIALOG_TITLE,
        'プリンタ設定を変更できませんでした。', 'OK');
      return null;
    }
  },

  async rotatePadding(orientation) {
    let top    = this.printSetting.printSettings.printDecorationSettings.padding.top;
    let bottom = this.printSetting.printSettings.printDecorationSettings.padding.bottom;
    let left   = this.printSetting.printSettings.printDecorationSettings.padding.left;
    let right  = this.printSetting.printSettings.printDecorationSettings.padding.right;
    let padding = {};
    if (orientation === 'LANDSCAPE') {
      padding.top = right;
      padding.bottom = left;
      padding.left = top;
      padding.right = bottom;
    } else {
      padding.top = left;
      padding.bottom = right;
      padding.left = bottom;
      padding.right = top;
    }
    this.printSetting.printSettings.printDecorationSettings.padding = padding;
    await this.updatePrintSettings(this.currentContext.constructionId, this.currentContext.albumId, this.printSetting.printSettings.printDecorationSettings);
  },
};
Object.setPrototypeOf(module.exports, EventEmitter.prototype);

// Internal functions
function useMinimumPadding(padding, devmode) {
  if (padding.top < devmode.paperOffsetTop) {
    padding.top = Math.ceil(devmode.paperOffsetTop);
  }
  if (padding.left < devmode.paperOffsetLeft) {
    padding.left = Math.ceil(devmode.paperOffsetLeft);
  }
  if (padding.right < devmode.paperOffsetRight) {
    padding.right = Math.ceil(devmode.paperOffsetRight);
  }
  if (padding.bottom < devmode.paperOffsetBottom) {
    padding.bottom = Math.ceil(devmode.paperOffsetBottom);
  }
}

