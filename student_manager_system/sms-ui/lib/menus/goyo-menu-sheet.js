'use strict';

const EventEmitter = require('events');
const windowHandler = require('../window-controller/window-handler');
const menuItems = require('./goyo-menu-sheet-items');
const contextMenu = require('./goyo-context-menu');
const MENU_TYPE = require('./goyo-menu-type');
const logger = require('../goyo-log')('goyo-menu-sheet');

class MenuSheet extends EventEmitter {

  constructor() {
    super();
    this.window = null;
    this.parentWindow = null;
    this.currentMenuType = MENU_TYPE.BOOKRACK;
    this.mainMenuType = MENU_TYPE.BOOKRACK;
    this.subMenuType = MENU_TYPE.BOOKRACK;
    this.currentTarget = null;
    this.options = null;
  }

  async open(menuTitles, items) {
    this.window = await windowHandler.openMenuSheetWindow();
  }

  close() {
    if (this.parentWindow) {
      this.parentWindow.focus();
    }
    this.window.destroy();
    this.window = null;
  }

  show(parent, target, menuOptions) {
    if (!this.window) return false;
    this.parentWindow = parent;
    this.currentMenuType = menuOptions.menuType;
    this.mainMenuType = menuOptions.menuType;
    this.subMenuType = menuOptions.subMenuType;
    this.currentTarget = target;
    this.options = menuOptions;

    this.window.webContents.send('show');
    return true;
  }


  // This method is called by renderer.
  onSelected(selectedItem) {
    logger.debug(`onSelected: ${selectedItem}`);
    this.emit('selected', selectedItem.actionId);
  }
  onCanceled() {
    logger.debug(`onCanceled`);
    this.emit('selected', null);
  }

  async capture(resizeWidth) {
    return new Promise((resolve,reject) => {
      this.parentWindow.capturePage(image => {
        resolve(image.resize({width: resizeWidth}));
      });
    });
  }

  getParentWindowSize() {
    return this.parentWindow.getSize();
  }
};

const menuSheet = new MenuSheet()
menuSheet.open().catch(e => logger.error('menu sheet could not open', e));

module.exports = {
  _counter: 0, // for Debug.
  _resolve: ()=>{},

  async show(parent, target, menuOptions) {
    // release previous opened menu sheet.
    this._resolve(null);
    this._resolve = ()=>{};

    let cnt = ++this._counter;
    try {
      logger.trace(`menu sheet opened type=${menuOptions.menuType}, count:${cnt}`);
      let promise = new Promise((resolve) => {
        let opened = menuSheet.show(parent, target, menuOptions);
        if (opened) {
          menuSheet.once('selected', (action) => { resolve(action); this._resolve = ()=>{}; });
          this._resolve = resolve;
        } else {
          resolve(null);
        }
      });

      return await promise;
    } catch(e) {
      logger.error('menu sheet could not show', e);
      return null;
    } finally {
      logger.trace(`menu sheet closed, count:${cnt}.`);
    }
  },

  getInstance(window) {
    // called from renderer process.
    return menuSheet;
  }
};

/*
 *
 *  show(type, ids..): actionId
 *  getInstance(win)
 *
 *  class MenuSheet
 *    Event
 *      selected(actionid)
 *      canceled
 *    Method
 *      open()
 *      close()
 *      show(type, ids..)
 *
 */

