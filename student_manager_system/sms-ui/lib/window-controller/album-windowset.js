'use strict';

// Node.js modules.
const assert = require('assert');
const EventEmitter = require('events');
const util = require('util');

// Electron modules.
const {BrowserWindow, webContents} = require('electron');

// Goyo modules.
const windowHandler = require('./window-handler');
const programSettings = require('../goyo-program-settings');
const uiParam = require('../goyo-ui-parameters');
const lockFactory = require('../lock-manager/goyo-lock-manager');
const logger = require('../goyo-log')('album-windowset');


// Modules variables.
const instanceMap = new Map();
const STATE_CONSTRUCTED = 0;
const STATE_OPENED = 1;
const STATE_CLOSING = 2;
const STATE_CLOSED = 3;


function toMapId(constructionId, albumId) {
  return `${constructionId}_${albumId}`;
}

class AlbumWindowSet extends EventEmitter {
  /* State transition
   *
   *               succeed        destroy
   * [CONSTRUCTED] --+--> [OPEND] ----> [CLOSING] ----> [CLOSED]
   *                 |
   *                 +--> [CLOSED]
   *                 fail
   *
   *   This state machine has responsibility of preventing unclosed window remaining
   *   in any situation of calling methods.
   */

  constructor(constructionId, albumId, frameId, frameIndex) {
    super();

    // property definition.
    this.state = STATE_CONSTRUCTED;
    this.constructionId = constructionId;
    this.albumId = albumId;
    this.frameId = frameId;
    this.frameIndex = frameIndex;
    this.currentMode = 'ALBUM_VIEW';
    this.photoWindowMap = new Map();
    this.photoWindowInstanceMap = new Map();
    this.minimapWindowInstanceMap = new Map();
    this.lockManager = null;

    this.mainWindow = null;
    this.mainWindowCloseListener = () => {
      if (this.state === STATE_OPENED) {
        this.state = STATE_CLOSING;
        this.unLockAlbum();

        this.photoWindowMap.forEach((photo, windowId) => {
          let win = BrowserWindow.fromId(windowId);
          win.close();
        });

        this.emit('closed');
        this.state = STATE_CLOSED;
      }
    };

    let asyncInit = async () => {
      try {
        await this.lockAlbum();

        let param = uiParam('album_view_window', this.constructionId, this.albumId);
        let opt = Object.assign({ frameId: this.frameId, frameIndex: this.frameIndex, appeal: true }, param);
        this.mainWindow = await windowHandler.openAlbumViewWindow(
          null, this.constructionId, this.albumId, opt
        );
        this.mainWindow.on('closed', this.mainWindowCloseListener);
        this.mainWindow.show();

        this.state = STATE_OPENED;
        this.emit('opened');
      } catch(e) {
        this.state = STATE_CLOSED;
        this.emit('failed', 'share');
        logger.error('asyncInit', e);
      }
    };

    this.initPromise = asyncInit();
  };

  async destroy() {
    if (this.state === STATE_CONSTRUCTED) {
      await this.initPromise;
    }

    if (this.state === STATE_OPENED) {
      this.state = STATE_CLOSING;
      this.unLockAlbum();

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.close();
      }
      this.photoWindowMap.forEach((photo, windowId) => {
        let win = BrowserWindow.fromId(windowId);
        win.close();
      });

      this.emit('closed');
      this.state = STATE_CLOSED;
    }
  };

  async lockAlbum() {
    // acquire album lock
    let locked = false;
    try {
      this.lockManager = await lockFactory.makeLockManagerByConstructionId(this.constructionId);
      locked = await this.lockManager.lockAlbum(this.albumId, true);
    } catch(e) {
      logger.error('Failed to lockManager', e);
      throw e;
    }
    if (!locked) {
      throw new Error(`Lock busy.(albumId=${this.albumId})`);
    }
  };

  unLockAlbum() {
    if (this.lockManager==null)
      return;

    // release album lock
    this.lockManager.lockAlbum(this.albumId, false)
    .then(() => {})
    .catch((e)=>{logger.error('Failed to lockManager.lockAlbum(unlock)', e)});
  };

  showAndFocus(frameIndex=null, frameId=null) {
    this.initPromise.then(() => {
      if (this.state === STATE_OPENED) {
        if (frameIndex != null && frameIndex>=0) {
          this.mainWindow.webContents.send('focus-frame-by-index', frameIndex, true);
        } else if (frameId > 0) {
          this.mainWindow.webContents.send('focus-frame-by-id', frameId, true);
        }
        this.mainWindow.focus();
      }
    });
  }

  get window() {
    return this.initPromise.then(() => this.mainWindow);
  }

  setEnable(enable) {
    // TODO: this function may not be used now. remove.
    this.mainWindow.setEnabled(enable);
  }

  async openMiniMapWindow(parent, windowInfo, params) {
    let win = await windowHandler.openPhotoMiniMapWindow(parent, windowInfo, params);
    win.show();
    win.on('close', (e) => {
      this.minimapWindowInstanceMap.delete(win.id);
    });
    return win;
  };

  moveRegionPhotoView(windowId, x, y) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('preview', x, y);
    }
  };

  handleMiniMapKeycode(windowId, keyCode, ctrlKey, shiftKey) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('keypress', keyCode, ctrlKey, shiftKey);
    }
  };
  
  dispatchChildFocus(windowId) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('childFocus');
    }
  }
  
  dispatchParentFocus(windowId) {
    let ev = this.minimapWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('parentFocus');
    }
  }
  
  dispatchPreviewOpened(windowId) {
    let ev = this.photoWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('previewOpened');
    }
  }

  setNewZoom(windowId, cord) {
    let ev = this.minimapWindowInstanceMap.get(windowId);
    if (ev != undefined) {
      ev.emit('zoom', cord.x, cord.y, cord.w, cord.h);
    }
  };

  async openPhotoWindow(frameId, scaleFlag = false, cropFlag = false) {
    if (this.clicked == undefined && this.getWindowHasPhoto(frameId).length === 0) {
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
      windowSettings.windowType = (!scaleFlag && !cropFlag) ? 
        programSettings.displayImage.windowSettings.windowType : 0;
      windowSettings.fullType =
        programSettings.displayImage.windowSettings.fullType;
      windowSettings.shootingDate =
        programSettings.displayImage.shootingDate;
      if (programSettings.displayImage.windowSettings.windowType == 1 && !scaleFlag && !cropFlag) {
        frameless = true;
      } else if (
        programSettings.displayImage.windowSettings.windowType == 2 && !scaleFlag && !cropFlag) {
        fullscreen = true;
      }
      // switch (programSetting) {
      // case '':
      var win = await windowHandler.openPhotoViewWindow(
          null, this.constructionId, this.albumId, frameId, frameless, fullscreen, windowSettings, this.currentMode, scaleFlag, cropFlag);
      // break;
      // case '':
      // var win = await windowHandler.openPhotoViewWindow(this.baseWindow,
      // this.constructionId, this.albumId, frameId); break;
      // case '':
      // var win = await windowHandler.openPhotoViewWindow(this.baseWindow,
      // this.constructionId, this.albumId, frameId); break;
      // }
  
      win.on('close', (e) => {
        this.photoWindowMap.delete(win.id);
        this.photoWindowInstanceMap.delete(win.id);
      });
      this.photoWindowMap.set(win.id, frameId);
      delete this.clicked;
      return win;
    }
    if(this.clicked == undefined && this.getWindowHasPhoto(frameId).length === 1 && scaleFlag) {
      
      let winId = this.getWindowHasPhoto(frameId);
      let webContent = webContents.fromId(winId[0]);
      webContent.executeJavaScript(`actions["PHOTOEDIT:SCALING"].run(remote.getCurrentWindow(), null);`);
    }
  };

  async openPhotoWindowOtherMode(frameId, win) {
    if (this.clicked == undefined) {
      this.clicked = true;
      win.show();
      logger.debug(`open win.id=${win.id}`);
      win.on('close', (e) => {
        logger.debug(`close win.id=${win.id}`);
        this.photoWindowMap.delete(win.id);
        this.photoWindowInstanceMap.delete(win.id);
      });
      this.photoWindowMap.set(win.id, frameId);
      delete this.clicked;
      return win;
    }
  }

  getWindowHasPhoto(photoId) {
    let collection = [];
    this.photoWindowMap.forEach((photo, windowId) => {
      if (photo === photoId) {
        collection.push(windowId);
      }
    });
    return collection;
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



  // Static methods.
  //  These methods has responsibility of preventing multiple window of same album.
  //  So, DO NOT MAKE THESE FUNCTIONS 'ASYNC'.

  static open(constructionId, albumId, frameId, frameIndex) {
    assert(constructionId!==undefined);
    assert(albumId!==undefined);

    let key = toMapId(constructionId, albumId);
    if (instanceMap.has(key)) {
      let instance = instanceMap.get(key);
      instance.showAndFocus(null, frameId);
      return instance;
    } else {
      let instance = new AlbumWindowSet(constructionId, albumId, frameId, frameIndex);
      instanceMap.set(key, instance);

      let closeListener = () => {
        if (instanceMap.delete(key)) {
          this.eventEmitter.emit('closed', constructionId, albumId);
        }
      }
      closeListener.key = key;
      let openListener = () => {
        this.eventEmitter.emit('opened', constructionId, albumId);
      }
      openListener.key = key;

      instance.on('closed', closeListener);
      instance.on('failed', closeListener);
      instance.on('opened', openListener);
      return instance;
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
      let openListener = instance.listeners('opened').find(l => l.hasOwnProperty('key') && l.key===key);
      if (openListener) {
        instance.removeListener('opened', openListener);
      }
      let closeListener = instance.listeners('closed').find(l => l.hasOwnProperty('key') && l.key===key);
      if (closeListener) {
        instance.removeListener('closed', closeListener);
        instance.removeListener('failed', closeListener);
      }
      instance.destroy();
      instanceMap.delete(key);
      this.eventEmitter.emit('closed', constructionId, albumId);
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

  static on(eventname, func) {
    return this.eventEmitter.on(eventname, func);
  }
  static removeListener(eventname, func) {
    return this.eventEmitter.removeListener(eventname, func);
  }
};

AlbumWindowSet.eventEmitter = new EventEmitter();
AlbumWindowSet.on('opened', (c,a) => logger.debug(`open: ${c}, ${a}`));
AlbumWindowSet.on('closed', (c,a) => logger.debug(`closed: ${c}, ${a}`));

module.exports = AlbumWindowSet;

