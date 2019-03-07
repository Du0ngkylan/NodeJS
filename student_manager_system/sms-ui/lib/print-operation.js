'use strict';

// Node.js modules.
const EventEmitter = require('events');

// Electron modules.
const {
  BrowserWindow
} = require('electron');

// Goyo modules.
const devMode = require('./devmode-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const logger = require('./goyo-log')('print-operation');

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
  devmodeInformation: null
}

