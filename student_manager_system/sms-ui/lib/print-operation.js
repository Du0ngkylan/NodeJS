
// Node.js modules.
const path = require('path');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const windowHandler = require('./window-controller/window-handler');

// 3rd-party modules.
const writeFile = require('fs').writeFileSync;

class PrintPreviewer {

  constructor() {
    this.win = null;
    this.OnChangePaperSettings = null;
    this.onChangeTargetPages = null;
    this.maxPagesNumber = null;
  }

  set targetWindow(win) {
    this.win = win;
  }

  get targetWindow() {
    return this.win;
  }

  async getPreview(page) {
    await this.onChangeTargetPages(page);

    let imageObject = await new Promise((resolve, reject) => {
      setTimeout(() => {
        this.targetWindow.webContents.capturePage(image => {
          resolve(image);
        });
      }, 100);
    });
    return imageObject;
  }

  async print(pageStyle) {
    await this.onChangeTargetPages();
    await this.OnChangePaperSettings(pageStyle);

    let image = await new Promise((resolve, reject) => {
      this.targetWindow.webContents.printToPDF({ pageSize: 'A5', printBackground: true }, (error, data) => {
        if (error) throw error
        writeFile(path.join(__dirname, '../contents/print_preview_window/pdf/page.pdf'), data, (error) => {
          if (error) throw error
          console.log('Write PDF successfully.')
        });
      });
    });
  }

  async setPaperSize(pageSize) {
    await this.OnChangePaperSettings(pageSize);
  }

  async setPrintDecorations(printDecoration) {
    await this.OnChangePaperSettings(printDecoration);
  }

}

module.exports = {

  singleInstance: null,
  doubleInstance: null,
  multiLayoutInstance: null,

  startPreview: async function (parent, bookrackId, albumId) {

    let s = windowHandler.openPrintSingleWindow(null, bookrackId, albumId);
    let d = windowHandler.openPrintDoubleWindow(null, bookrackId, albumId);
    let m = windowHandler.openPrintMultiLayoutWindow(null, bookrackId, albumId);
    // d.show();
    this.singleInstance = new PrintPreviewer();
    this.doubleInstance = new PrintPreviewer();
    this.multiLayoutInstance = new PrintPreviewer();

    this.singleInstance.targetWindow = await s;
    this.doubleInstance.targetWindow = await d;
    this.multiLayoutInstance.targetWindow = await m;

    // ブラウザ(Chromium)の起動, 初期画面のロード
    let previewWin = await windowHandler.openPrintPreviewWindow(null);
    previewWin.show();
    previewWin.on('close', () => {
      this.singleInstance.targetWindow.destroy();
      this.doubleInstance.targetWindow.destroy();
      this.multiLayoutInstance.targetWindow.destroy();
      this.singleInstance = null;
      this.doubleInstance = null;
      this.multiLayoutInstance = null;
    });
  },

  getPrintPreviewer: function (obj) {
    switch (obj) {
      case 'SINGLE':
        return this.singleInstance;
        break;
      case 'DOUBLE':
        return this.doubleInstance;
        break;
      case 'MULTILAYOUT':
        return this.multiLayoutInstance;
        break;
    }
  },
};






