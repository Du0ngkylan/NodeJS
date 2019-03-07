'use strict'

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');

// Electron modules.
const {
  BrowserWindow, ipcMain
} = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');
const GeneralWindowSet = require('./general-windowset');
//const bookrackAccessor = require('sms-accessor');
const programSettings = require('../goyo-program-settings');
const lockFactory = require('../lock-manager/goyo-lock-manager');
const logger = require('../goyo-log')('tree-view-controller');

// Module variable
const instanceMap = new Map();

class TreeViewWindowSet extends EventEmitter {

  constructor(constructionId) {
    super();
    // property definition.
    this.constructionId = constructionId;
    this.mainWindow = null;
    this.photoWindowMap = new Map();
    this.currentMode = 'TREE_VIEW';
    this.photoWindowInstanceMap = new Map();
    this.minimapWindowInstanceMap = new Map();
    this.photoDetailWindowMap = new Map();
    this.mainWindowClosedEventCounter = 0;
    instanceMap.set(constructionId, this);
    this.lockManager = null;
  };

  // Instance methods.

  async initialize() {
    let promise = windowHandler.openBookrackTreeviewWindow(null, this.constructionId);
    this.mainWindow = promise.browserWindow;
    await promise;

    this.mainWindow.show();
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      setImmediate(() => {
        TreeViewWindowSet.close(this.constructionId);
      });
      this.photoWindowMap.forEach((photoId,windowId) => {
        let win = BrowserWindow.fromId(windowId);
        if (win) {
          logger.debug(`close windowId=${windowId}`);
          win.close();
        }
      })
      if(2<=this.mainWindowClosedEventCounter){
        logger.error('Duplication call "closed" event');
      }
      this.mainWindowClosedEventCounter++
    });

    await this.lockSharedConstruction();
  };

  close() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  async destroy() {
    if (this.mainWindow) this.mainWindow.close();
    GeneralWindowSet.closeAll();
    // release all lock
    await this.unLockSharedConstruction();
    this.emit('closed');
    ipcMain.removeAllListeners('ondragstart');
  };

  selectBookrackItem(bookrackItemId, frameId=null) {
    this.mainWindow.webContents.send('select', bookrackItemId, frameId);
  }

  focusWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
    }
  }

  async lockSharedConstruction() {
    // acquire shared lock
    try {
      this.lockManager = await lockFactory.makeLockManagerByConstructionId(this.constructionId);
      await this.lockManager.lockConstruction(true);
    } catch(e) {
      logger.error('Failed to lockManager', e);
      // On failure, do not lock
      this.lockManager = await lockFactory.makeLockManager();
    }
  }

  async unLockSharedConstruction() {
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
  }

  async openPhotoDetailWindow(albumId, photoId) {
    if(!this.getWindowId(photoId,this.photoDetailWindowMap)){
      var win = await windowHandler.openPhotoDetailWindow(this.mainWindow, this.constructionId, albumId, photoId);
      win.show();
      let winId = win.id;
      win.on('closed', () => {
        this.photoWindowMap.delete(winId);
        this.photoDetailWindowMap.delete(winId);
      });
      this.photoWindowMap.set(winId,photoId);
      this.photoDetailWindowMap.set(winId,photoId);
    }
  };
  getWindowId(getPhotoId,checkMap,parentWindowId = -1) {
    for(let [windowId,photoId] of checkMap){
      if(parentWindowId !== windowId){
        if(photoId === getPhotoId){
          return windowId;
        }
      }
    }
    return null;
  };

  setNewPhotoId(browserWindowId, photoId) {
    this.photoWindowMap.set(browserWindowId, photoId);
  };

  setEventPhotoView(windowId, instance) {
    this.photoWindowInstanceMap.set(windowId, instance);
  };

  setMinimapWindowEvent(windowId, instance) {
    this.minimapWindowInstanceMap.set(windowId, instance);
  };

  async openPhotoWindow(albumId, photoId) {
    let detailWindowId = this.getWindowId(photoId,this.photoDetailWindowMap);
    if (!this.clicked&& 
        !this.getWindowId(photoId,this.photoWindowMap,detailWindowId)) {
      this.clicked = true;
      let windowSettings = {};
      let frameless = false;
      let fullscreen = false;
      windowSettings.adjustImage =
        programSettings.displayImage.windowSettings.adjustImage;
      windowSettings.centerScreen =
        programSettings.displayImage.windowSettings.centerScreen;
      windowSettings.moveToCenter =
        programSettings.displayImage.windowSettings.moveToCenter;
      windowSettings.windowType =
        programSettings.displayImage.windowSettings.windowType;
      windowSettings.fullType =
        programSettings.displayImage.windowSettings.fullType;
      windowSettings.shootingDate =
        programSettings.displayImage.shootingDate;
      if (programSettings.displayImage.windowSettings.windowType == 1) {
        frameless = true;
      } else if (
        programSettings.displayImage.windowSettings.windowType == 2) {
        fullscreen = true;
      }
      var win = await windowHandler.openPhotoViewWindow(
        null, this.constructionId, albumId, (photoId), frameless, fullscreen, windowSettings, this.currentMode);
      let winId = win.id;
      win.on('closed', (e) => {
        this.photoWindowMap.delete(winId);
        this.photoWindowInstanceMap.delete(winId);
      });
      this.photoWindowMap.set(winId, photoId);
      delete this.clicked;
      return win;
    }
  };

  async openPhotoWindowOtherMode(albumId, photoId, win) {
    if (this.clicked == undefined) {
      this.clicked = true;
      win.show();
      logger.debug(`open win.id=${win.id}`);
      win.on('close', (e) => {
        logger.debug(`close win.id=${win.id}`);
        this.photoWindowMap.delete(win.id);
        this.photoWindowInstanceMap.delete(win.id);
      });
      this.photoWindowMap.set(win.id, photoId);
      delete this.clicked;
      return win;
    }
  };

  async openMiniMapWindow(parent, windowInfo, params) {
    let win = await windowHandler.openPhotoMiniMapWindow(parent, windowInfo, params);
    win.show();
    win.on('close', (e) => {
      this.minimapWindowInstanceMap.delete(win.id);
    });
    return win;
  };

  dispatchPreviewOpened(windowId) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('previewOpened');
    }
  }

  dispatchParentFocus(windowId) {
    let ev = this.minimapWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('parentFocus');
    }
  }

  moveRegionPhotoView(windowId, x, y) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('preview', x, y);
    }
  };

  dispatchChildFocus(windowId) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('childFocus');
    }
  }

  setNewZoom(windowId, cord) {
    let ev = this.minimapWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('zoom', cord.x, cord.y, cord.w, cord.h);
    }
  };

  handleMiniMapKeycode(windowId, keyCode, ctrlKey, shiftKey) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('keypress', keyCode, ctrlKey, shiftKey);
    }
  };

  setEnable(enable) {
    this.mainWindow.setEnabled(enable);
  };


  // Static methods.

  static open(constructionId, bookrackItemId=null) {
    assert(constructionId !== undefined);

    if (instanceMap.has(constructionId)) {
      return instanceMap.get(constructionId);
    } else {
      let instance = new TreeViewWindowSet(constructionId);
      instanceMap.set(constructionId, instance);
      instance.initialize()
        .then(r => instance.selectBookrackItem(bookrackItemId))
        .catch(e => {/* never reach */});
      return instance;
    }
  }

  static get(constructionId) {
    return instanceMap.get(constructionId);
  }

  static isOpened(constructionId) {
    assert(constructionId !== undefined);
    return instanceMap.has(constructionId);
  }

  static close(constructionId) {
    assert(constructionId !== undefined);

    if (instanceMap.has(constructionId)) {
      let instance = instanceMap.get(constructionId);
      instance.destroy();
      instanceMap.delete(constructionId);
    }
  }
}

module.exports = TreeViewWindowSet;