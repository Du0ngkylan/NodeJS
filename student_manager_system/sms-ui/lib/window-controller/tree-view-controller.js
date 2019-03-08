'use strict'

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');

// Module variable
const instanceMap = new Map();

class TreeViewWindowSet extends EventEmitter {

  constructor(constructionId) {
    super();
    // property definition.
    this.constructionId = constructionId;
    this.mainWindow = null;
    this.photoWindowMap = new Map();

    instanceMap.set(constructionId, this);
  };

  // Instance methods.

  async initialize() {
    this.mainWindow = await windowHandler.openBookrackTreeviewWindow(null, this.constructionId);
    this.mainWindow.show();
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      setImmediate( () => {
        TreeViewWindowSet.close(this.constructionId);
      });
    });
  };

  destroy() {
    if (this.mainWindow) this.mainWindow.close();
    this.emit('closed');
  };

  async openPhotoWindow(albumId, photoId) {
    var win = await windowHandler.openPhotoDetailWindow(this.mainWindow, this.constructionId, albumId, photoId);
    win.show();
    win.on('closed', () => {
      this.photoWindowMap.delete(photoId);
    });

    this.photoWindowMap.set(photoId, win);
  };

  setEnable(enable) {
    if (enable) {
      windowDisabler.activate(this.mainWindow);
    } else {
      windowDisabler.inactivate(this.mainWindow);
    }
  };


  // Static methods.

  static async open(constructionId) {
    assert(constructionId!==undefined);

    if (instanceMap.has(constructionId)) {
      return instanceMap.get(constructionId);
    } else {
      let instance = new TreeViewWindowSet(constructionId);
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

module.exports = TreeViewWindowSet;

