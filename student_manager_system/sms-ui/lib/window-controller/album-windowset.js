'use strict';

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');
const util = require('util');

// Electron modules.
const {BrowserWindow} = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');
const { windowDisabler } = require('../goyo-utils');
const goyoDialog = require('../goyo-dialog-utils');
const bookrackAccessor = require('goyo-bookrack-accessor');
// const programSetting = require('./goyo-program-setting');
// const programSetting = '';

// Modules variables.
const instanceMap = new Map();


function toMapId(constructionId, albumId) {
  return `${constructionId}_${albumId}`;
}

class AlbumWindowSet extends EventEmitter {

  constructor(constructionId, albumId) {
    super();

    // property definition.
    this.constructionId = constructionId;
    this.albumId = albumId;
    this.currentMode = 'ALBUM_VIEW';
    this.photoWindowMap = new Map();

    this.mainWindow = null;
    this.mainWindowCloseListener = () => {
      this.mainWindow = null;
      setImmediate(() => {
        AlbumWindowSet.close(this.constructionId, this.albumId);
      });
    };
  };

  async initialize() {
    await this.switchToAlbumViewWindow();
  };

  destroy() {
    if (this.mainWindow) this.mainWindow.close();
    while(this.photoWindowMap.length > 0) {
      let win = this.photoWindowMap.shift();
      win.close();
    }

    this.emit('closed');
  };

  showAndFocus(photoId) {
    if (photoId) {
      this.mainWindow.webContents.send('show-photo', photoId);
    }
    this.mainWindow.focus();
  }


  setEnable(enable) {
    if (enable) {
      windowDisabler.activate(this.mainWindow);
    } else {
      windowDisabler.inactivate(this.mainWindow);
    }
  }

  async switchToPhotoListWindow() {
    if (this.mainWindow) {
      this.mainWindow.removeListener('closed', this.mainWindowCloseListener);
      this.mainWindow.destroy();
    }

    this.mainWindow = windowHandler.openPhotoListWindow(null, this.constructionId, this.albumId);
    this.mainWindow = await this.mainWindow;
    this.mainWindow.on('closed', this.mainWindowCloseListener);
    this.mainWindow.show();
  };

  async switchToAlbumViewWindow() {
    if (this.mainWindow) {
      this.mainWindow.removeListener('closed', this.mainWindowCloseListener);
      this.mainWindow.destroy();
    }

    this.mainWindow = await windowHandler.openAlbumViewWindow(null, this.constructionId, this.albumId);
    this.mainWindow.on('closed', this.mainWindowCloseListener);
    this.mainWindow.show();
  };

  async openPhotoWindow(photoId) {
    if (this.clicked == undefined && this.getWindowHasPhoto(photoId).length === 0) {
      this.clicked = true;
      const programSettings = await bookrackAccessor.getProgramSettings();
      let frameless = false;
      let fullscreen = false;
      if (programSettings && programSettings.programSettings &&
          programSettings.programSettings.displayImage &&
          programSettings.programSettings.displayImage.windowSettings) {
        if (programSettings.programSettings.displayImage.windowSettings
                .windowType == 1) {
          frameless = true;
        } else if (
            programSettings.programSettings.displayImage.windowSettings
                .windowType == 2) {
          fullscreen = true;
        }
      }
      // switch (programSetting) {
      // case '':
      var win = await windowHandler.openPhotoViewWindow(
          null, this.constructionId, this.albumId, photoId, frameless, fullscreen);
      // break;
      // case '':
      // var win = await windowHandler.openPhotoViewWindow(this.baseWindow,
      // this.constructionId, this.albumId, photoId); break;
      // case '':
      // var win = await windowHandler.openPhotoViewWindow(this.baseWindow,
      // this.constructionId, this.albumId, photoId); break;
      // }
  
      win.show();
      win.on('close', (e) => {
        this.photoWindowMap.delete(win.id);
      });
      this.photoWindowMap.set(win.id, photoId);
      delete this.clicked;
    }
  };

  getWindowHasPhoto(photoId) {
    let collection = [];
    this.photoWindowMap.forEach((photo, windowId) => {
      if (photo === photoId) {
        collection.push(windowId);
      }
    });
    return collection;
  }

  setNewPhotoId(browserWindowId, photoId) {
    const win = this.photoWindowMap.get(browserWindowId);
    this.photoWindowMap.set(browserWindowId, photoId);
  }

  // Static method.

  static async open(constructionId, albumId) {
    assert(constructionId!==undefined);
    assert(albumId!==undefined);

    let key = toMapId(constructionId, albumId);
    if (instanceMap.has(key)) {
      return instanceMap.get(key);
    } else {
      let instance = new AlbumWindowSet(constructionId, albumId);
      instanceMap.set(key, instance);
      await instance.initialize();
      return instance;
    }
  }

  static get(constructionId, albumId) {
    return instanceMap.get(toMapId(constructionId, albumId));
  }

  static getAll(constructionId) {
    let instances = Array.from(instanceMap.values());
    if (constructionId) {
      return instances.filter( i => i.constructionId===constructionId );
    } else {
      return instances;
    }
  }

  static isOpened(constructionId, albumId) {
    assert(constructionId!==undefined);
    assert(albumId!==undefined);
    return instanceMap.has(toMapId(constructionId, albumId));
  }

  static close(constructionId, albumId) {
    assert(constructionId!==undefined);
    assert(albumId!==undefined);

    let key = toMapId(constructionId, albumId);
    if (instanceMap.has(key)) {
      let instance = instanceMap.get(key);
      instance.destroy();
      instanceMap.delete(key);
    }
  }
};

module.exports = AlbumWindowSet;
