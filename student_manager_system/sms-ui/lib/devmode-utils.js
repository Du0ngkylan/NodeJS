const goyoNativeUi = require('goyo-native-ui');

class PrintSetting {
  constructor(devmode, devname) {
    if (!devmode || !devname) {
      throw new Error("parameter devmode and devname are needed.");
    }
    this._devmode = makeDevmodeBuffer(devmode);
    this._devname = makeDevmodeBuffer(devname);

    checkDevBuffers(this._devmode, this._devname);

    this._printInfo = null;
    this._getPaperInfoIfNeeded();
  }

  changeOrientation(orientation) {
    // this function strictly dependents on DEVMODE struction in Win32 API.
    // see https://msdn.microsoft.com/ja-jp/library/windows/desktop/dd183565%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
    const OFFSET_OF_ORIENTATION_IN_DEVMODE = 76;
    if (orientation==="PORTRAIT") {
      var val = 1;
    } else if (orientation==="LANDSCAPE") {
      var val = 2;
    } else {
      var val = 1;
    }
    this._devmode.writeInt16LE(val, OFFSET_OF_ORIENTATION_IN_DEVMODE);
    this._printInfo = null;
  }

  get devmode() {
    return this._devmode;
  }
  get devname() {
    return this._devname;
  }
  get paperWidth() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.paperWidth;
  }
  get paperHeight() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.paperHeight;
  }
  get paperSize() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.paperSize;
  }
  get paperOffsetLeft() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.offsetX;
  }
  get paperOffsetTop() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.offsetY;
  }
  get paperOffsetRight() {
    this._getPaperInfoIfNeeded();
    let pi = this._printInfo;
    return pi.paperWidth - pi.printableWidth - pi.offsetX;
  }
  get paperOffsetBottom() {
    this._getPaperInfoIfNeeded();
    let pi = this._printInfo;
    return pi.paperHeight - pi.printableHeight - pi.offsetY;
  }
  get printableWidth() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.printableWidth;
  }
  get printableHeight() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.printableHeight;
  }
  get orientation() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.orientation;
  }
  get duplexMode() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.duplexMode;
  }
  get deviceName() {
    this._getPaperInfoIfNeeded();
    return this._printInfo.deviceName;
  }

  _getPaperInfoIfNeeded() {
    if (!this._printInfo) {
      this._printInfo = goyoNativeUi.printing.getPrintDetail(this.devmode, this.devname);
    }
  }
}

function makeDevmodeBuffer(devmode) {
  if (typeof devmode === 'string') {
    return Buffer.from(devmode, 'hex');
  } else if (devmode instanceof Buffer) {
    return devmode;
  } else {
    throw new Error('');
  }
}

function checkDevBuffers(devmode, devname) {
  if (!(devmode instanceof Buffer)) throwE('devmode is not Buffer obuject.');
  if (!(devname instanceof Buffer)) throwE('devname is not Buffer obuject.');

  if (devmode.length < 70) throwE('invalid size of devmode buffer.');
  if (devmode.length < devmode.readUInt16LE(68)) throwE(`invalid size of devmode buffer(less than${devmode.readUInt16LE(68)})`);

  if (devname.length < 8) throwE('invalid size of devname buffer');

  function throwE(msg) {
    throw new Error(msg);
  }
}

function getDefaultPrintSetting() {
  let result = goyoNativeUi.printing.getDefaultPrintSetting();
  let defaultPrintSetting = new PrintSetting(result.devmode, result.devname);
  defaultPrintSetting._getPaperInfoIfNeeded();
  return defaultPrintSetting;
}

function showPrintDialog(parent, printSetting) {
  let newPrintSetting;
  newResult = goyoNativeUi.printing.showPrintSetupDialog(parent, printSetting.devmode, printSetting.devname);
  if (newResult) {
    newPrintSetting = new PrintSetting(newResult.devmode, newResult.devname);
    newPrintSetting._getPaperInfoIfNeeded();
  }
  return newPrintSetting;
}

function showFontDialog(parent, logFont, effect, limitSize) {
  let result;
  let newLogFont = goyoNativeUi.nativeUi.showDialog(parent, logFont, effect, limitSize);
  if (newLogFont && newLogFont.hasOwnProperty('fontBinary')) {
    result = goyoNativeUi.nativeUi.getFontParameter(newLogFont.fontBinary);
    result.fontBinary = newLogFont.fontBinary;
    result.fontColor = newLogFont.fontColor;
  }
  return result;
}

function showColorPickerDialog(parent, color) {
  return goyoNativeUi.colorPicker.showDialog(parent, color);
}

function updateOrientation(orientation, printerSettings) {
  let newPrintSetting = new PrintSetting(printerSettings.devmode, printerSettings.devname);
  newPrintSetting.changeOrientation(orientation);
  newPrintSetting._getPaperInfoIfNeeded();
  return newPrintSetting;
}

module.exports = {
  PrintSetting,
  getDefaultPrintSetting,
  showPrintDialog,
  showFontDialog,
  showColorPickerDialog,
  updateOrientation
};


// Native

// getDefaultPrintSetting(): Buffer
// showPrintDialog(Buffer): { fontBinary : Buffer, fontColor : String }
// getPaperInformation(Buffer): {}
