'use strict';
const assert = require('assert');
const windowHandler = require('./window-handler');
const BookrackViewWindowSet = require('./bookrackview-windowset');
const TreeViewWindowSet = require('./tree-view-controller');
const logger = require('../goyo-log')('view-mode');
const lockManagers = require('../lock-manager/goyo-lock-manager');

const viewMode = {

  // Constants.
  MODE_CONSTRUCTION_SELECTION: 'CONSTRUCTION_SELECTION',
  MODE_BOOKRACK_LIST: 'BOOKRACK_LIST',
  MODE_BOOKRACK_VIEW: 'BOOKRACK_VIEW',
  MODE_TREE_VIEW: 'TREE_VIEW',


  // Instance properties(private).
  mainWindowHandle: null,


  // Instance methods(public).
  setNextMode: function(mode, param) {
    if (mode) {
      this.next = { mode, param };
    } else {
      this.next = null;
    }
  },

  closeCurrentModeWindow: function() {
    this.mainWindowHandle.close();
  },

  focusCurrentModeWindow: function() {
    this.mainWindowHandle.focusWindow();
  },

  startApplication: async function() {
    logger.trace('startApplication: begin');
    while (this.next) {
      let current = this.next;
      this.next = null;

      logger.trace(`startApplication: start mode:${current.mode}`);
      await this.windowMakingFunctions[current.mode](current.param);
    }
    logger.trace('startApplication: end');
  },

  windowMakingFunctions: {
    'TREE_VIEW': async(param) => {
      logger.info('view-mode: switch to TreeView');

      viewMode.mainWindowHandle = TreeViewWindowSet.open(param.constructionId, param.bookrackItemId);
      return new Promise((resolve, reject) => {
        viewMode.mainWindowHandle.on('closed', async() => {
          await lockManagers.waitConstructionUnLockAll();
          resolve();
        });
      });
    },
    'CONSTRUCTION_SELECTION': async (param) => {
      logger.info('view-mode: switch to ConstructionSlection');
      let promise = windowHandler.openConstructionWindow(null, param.selectionMode, param.defaultConstructionId);

      viewMode.mainWindowHandle = promise.browserWindow;
      await promise;
      viewMode.mainWindowHandle.show();
      viewMode.mainWindowHandle.focusWindow = function() {
        if (viewMode.mainWindowHandle) {
          if (viewMode.mainWindowHandle.isMinimized()) viewMode.mainWindowHandle.restore()
          viewMode.mainWindowHandle.focus()
        }
      }

      return new Promise((resolve, reject) => {
        viewMode.mainWindowHandle.on('closed', () => {
          resolve();
        });
      });
    },
    'BOOKRACK_LIST': async (param) => {
      logger.info('view-mode: switch to BookrackListWindow');
      let promise = windowHandler.openBookrackListWindow(null, param.constructionId, param.defaultBookrackId);

      viewMode.mainWindowHandle = promise.browserWindow;
      await promise;
      viewMode.mainWindowHandle.show();
      viewMode.mainWindowHandle.focusWindow = function() {
        if (viewMode.mainWindowHandle) {
          if (viewMode.mainWindowHandle.isMinimized()) viewMode.mainWindowHandle.restore()
          viewMode.mainWindowHandle.focus()
        }
      }

      return new Promise((resolve, reject) => {
        viewMode.mainWindowHandle.on('closed', () => {
          resolve();
        });
      });
    },
    'BOOKRACK_VIEW': async (param) => {
      logger.info('view-mode: switch to BookrackView');
      viewMode.mainWindowHandle = BookrackViewWindowSet.open(param.constructionId, param.bookrackId, param.albumId);
      return new Promise((resolve, reject) => {
        viewMode.mainWindowHandle.on('closed', async() => {
          await lockManagers.waitConstructionUnLockAll();
          resolve();
        });
      });
    },

  },
};
module.exports = viewMode;

