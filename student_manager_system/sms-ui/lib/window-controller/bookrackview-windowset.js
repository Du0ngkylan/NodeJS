'use strict'

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');
const printOperation = require('../print-operation');
const AlbumWindowSet = require('./album-windowset');
const {windowDisabler} = require('../goyo-utils');
const goyoDialog = require('../goyo-dialog-utils');

var instanceMap = new Map();

class BookrackViewWindowSet extends EventEmitter {

  constructor(constructionId) {
    super();
    // property definition.
    this.constructionId = constructionId;
    this.mainWindow = null;
    this.sortoutToolWindow = null;
    this.operationWidnow = null;
    this.ledgerPrintWindow = null;
  };

  // Instance methods.

  async initialize() {
    let promiseMain = windowHandler.openBookrackWindow(null, this.constructionId);
    let promiseSortoutTool = windowHandler.openPhotoSortoutToolWindow(null, this.constructionId);

    this.sortoutToolWindow = await promiseSortoutTool;
    this.sortoutToolWindow.on('closed', () => {
      this.sortoutToolWindow = null;
    });
    this.mainWindow = await promiseMain;
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
        AlbumWindowSet.close(this.constructionId, aWin.albumId);
      }
      setImmediate( () => {
        BookrackViewWindowSet.close(this.constructionId);
      });
    });
    this.mainWindow.show();
    this.sortoutToolWindow.show();
  };

  destroy() {
    for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
      AlbumWindowSet.close(this.constructionId, aWin.albumId);
    }
    if (this.sortoutToolWindow) this.sortoutToolWindow.close();
    if (this.mainWindow) this.mainWindow.close();
    this.sortoutToolWindow = null;
    this.mainWindow = null;
    this.emit('closed');
  };

  setEnable(enable) {
    if (enable) {
      windowDisabler.activate(this.mainWindow);
    } else {
      windowDisabler.inactivate(this.mainWindow);
    }
    for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
      aWin.setEnable(enable);
    }
  };

  async openLedgerPrintWindow(albumId) {
    // This window allows only one instance at a time.
    // return null if it has one instance already.

    if (this.ledgerPrintWindow) {
      await goyoDialog.showSimpleMessageDialog(null, '工事写真台帳印刷', '印刷ダイアログを重複して開くことはできません。先に起動しているダイアログを終了してから再度操作してください。', 'OK')
      return null;
    } else {
      return await printOperation.startPreview(null, this.constructionId, albumId);
    }
  };


  // Static methods.

  static async open(constructionId) {
    assert(constructionId!==undefined);

    if (instanceMap.has(constructionId)) {
      return instanceMap.get(constructionId);
    } else {
      let instance = new BookrackViewWindowSet(constructionId);
      instanceMap.set(constructionId, instance);
      await instance.initialize();
      return instance;
    }
  }

  static get(constructionId) {
    return instanceMap.get(constructionId);
  }

  static isOpened(constructionId) {
    assert(constructionId!==undefined);
    return instanceMap.has(constructionId);
  }

  static close(constructionId) {
    assert(constructionId!==undefined);

    if (instanceMap.has(constructionId)) {
      let instance = instanceMap.get(constructionId);
      instance.destroy();
      instanceMap.delete(constructionId);
    }
  }

}

module.exports = BookrackViewWindowSet;

