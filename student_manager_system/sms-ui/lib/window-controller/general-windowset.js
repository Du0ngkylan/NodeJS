'use strict';

// Node.js modules.
const EventEmitter = require('events');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const logger = require('../goyo-log')('general-windowset');

class GeneralWindowSet extends EventEmitter {

  constructor() {
    super();
    // property definition.
    this.windowIdSet = new Set();
  };

  putWindowId(windowId) {
    logger.debug(`put windowId=${windowId}`);
    this.windowIdSet.add(windowId);
  }

  deleteWindowId(windowId) {
    logger.debug(`delete windowId=${windowId}`);
    this.windowIdSet.delete(windowId);
  }

  closeAll() {
    this.windowIdSet.forEach((windowId) => {
      let win = BrowserWindow.fromId(windowId);
      if (win) {
        logger.debug(`close windowId=${windowId}`);
        win.close();
      }
    });    
    this.windowIdSet.clear();
    this.emit('closed');
  };

};

let instance = new GeneralWindowSet();

module.exports = instance;
