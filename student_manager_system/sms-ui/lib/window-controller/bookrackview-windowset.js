'use strict'

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');
const GeneralWindowSet = require('./general-windowset');
const printOperation = require('../print-operation');
const uiParam = require('../goyo-ui-parameters');
const AlbumWindowSet = require('./album-windowset');
//const {windowDisabler} = require('../goyo-utils');
const goyoDialog = require('../goyo-dialog-utils');
const programSettings = require('../goyo-program-settings');
const lockFactory = require('../lock-manager/goyo-lock-manager');
const logger = require('../goyo-log')('bookrackview-windowset');

// CONSTANT VALUES
const instanceMap = new Map();


class BookrackViewWindowSet extends EventEmitter {

  constructor(constructionId, bookrackId, albumId=null) {
    super();
    // property definition.
    this.constructionId = constructionId;
    this.bookrackId = bookrackId;
    this.albumId = albumId;
    this.mainWindow = null;
    this.sortoutToolWindow = null;
    this.operationWidnow = null;
    this.lockManager = null;
  };

  // Instance methods.

  async initialize() {
    let promiseSortoutTool;
    let param = uiParam('all_bookrack_window');
    let promiseMain = windowHandler.openBookrackWindow(null, this.constructionId, this.bookrackId, this.albumId, param);

    this.mainWindow = promiseMain.browserWindow;
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
        AlbumWindowSet.close(this.constructionId, aWin.albumId);
      }
      setImmediate( () => {
        BookrackViewWindowSet.close(this.constructionId);
      });
    });

    if (programSettings.otherSettings.showPhotoTool===1) {
      this.openPhotoSortoutTool();
    }

    await promiseMain;

    await this.lockSharedConstruction();

    this.mainWindow.show();
  };

  close() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  focusWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
    }
  }

  destroy() {
    logger.trace(`destroy(): begin`);
    GeneralWindowSet.closeAll();

    for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
      AlbumWindowSet.close(this.constructionId, aWin.albumId);
    }
    //if (this.sortoutToolWindow) this.sortoutToolWindow.close();
    //if (this.mainWindow) this.mainWindow.close();

    logger.trace(`destroy(): waiting window closed`);
    Promise.all([
      waitWindowDestroyed(this.sortoutToolWindow),
      waitWindowDestroyed(this.mainWindow)
    ]).then(async r => {
      logger.trace(`destroy(): finalize`);
      this.sortoutToolWindow = null;
      this.mainWindow = null;
      await this.unLockSharedConstruction();
      this.emit('closed');
    });
    logger.trace(`destroy(): end`);
  };

  async lockSharedConstruction() {
    // acquire shared lock
    try {
      logger.trace(`locking..`);
      this.lockManager = await lockFactory.makeLockManagerByConstructionId(this.constructionId);
      await this.lockManager.lockConstruction(true);
      logger.trace(`locking successful.`);
    } catch(e) {
      logger.error('Failed to lockManager', error);
      // On failure, do not lock
      this.lockManager = await lockFactory.makeLockManager();
    }
  };

  async unLockSharedConstruction() {
    logger.trace(`unlock`);
    // release all lock
    try {
      this.lockManager = await lockFactory.makeLockManagerByConstructionId(this.constructionId);
    } catch (error) {
      logger.error('Failed to lockManager', error);
      // On failure, do not lock
      this.lockManager = await lockFactory.makeLockManager();
    }
    this.lockManager.finalize(false)
    .then(() => {})
    .catch((e)=>{logger.error('Failed to lockManager.finalize', e)});
  };

  setEnable(enable) {
    this.mainWindow.setEnabled(enable);
    for (let aWin of AlbumWindowSet.getAll(this.constructionId)) {
      aWin.setEnable(enable);
    }
  };

  openPhotoSortoutTool() {
    if (!this.sortoutToolWindow) {
      let promiseSortoutTool = windowHandler.openPhotoSortoutToolWindow(null, this.constructionId);
      this.sortoutToolWindow = promiseSortoutTool.browserWindow;
      this.sortoutToolWindow.on('ready-to-show', () => {
        this.sortoutToolWindow.show();
      });
      this.sortoutToolWindow.on('closed', () => {
        this.sortoutToolWindow = null;
      });
    }
  }

  async openLedgerPrintWindow(parent, albumId, displayMode) {
    let textMode = displayMode == 'X' ? 'photo_information' : 'photo_sentence';

    // This window allows only one instance at a time.
    // return null if it has one instance already.
    let previewWin = await printOperation.startPreview(parent, this.constructionId, albumId, textMode);
    if (!previewWin) {
      await goyoDialog.showSimpleMessageDialog(
        parent,
        '工事写真台帳印刷',
        '印刷ダイアログを重複して開くことはできません。先に起動しているダイアログを終了してから再度操作してください。',
        'OK');
    }
  };


  // Static methods.

  static open(constructionId, bookrackId, albumId) {
    logger.trace(`open(${constructionId}, ${bookrackId}) begin`);
    assert(constructionId!==undefined);

    if (instanceMap.has(constructionId)) {
      return instanceMap.get(constructionId);
    } else {
      logger.trace(`open(): new BookrackViewWindowSet()`);
      let instance = new BookrackViewWindowSet(constructionId, bookrackId, albumId);
      instanceMap.set(constructionId, instance);
      logger.trace(`open(): call intialize()`);
      instance.initialize().catch(e => {/* never reach. */});
      return instance;
    }
  }

  static get(constructionId) {
    if (constructionId) {
      return instanceMap.get(parseInt(constructionId));
    } else if (instanceMap.size > 0) {
      return instanceMap.values().next().value;
    } else {
      return null;
    }
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

function waitWindowDestroyed(window) {
  if (window instanceof BrowserWindow && !window.isDestroyed()) {
    return new Promise(r => {
      window.on('closed', r);
      window.close();
    });
  } else {
    return Promise.resolve(true);
  }
}

module.exports = BookrackViewWindowSet;

