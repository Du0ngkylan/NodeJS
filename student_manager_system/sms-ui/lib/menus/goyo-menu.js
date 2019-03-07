'use strict';

// Electron modules.

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const programSettings = require('../goyo-program-settings');
const menuSheet = require('./goyo-menu-sheet');
const windowsMenu = require('./goyo-windows-menu');
const MENU_TYPE = require('./goyo-menu-type');


module.exports = {
  show(parentWindow, target, menuOptions) {
    menuOptions.simpleMenu = (programSettings.menuSettings.simpleMenu === 1);
    menuOptions.maxHistory = programSettings.menuSettings.history;
    if (programSettings.menuSettings.menuType === 2) {
      switch (menuOptions.menuType) {
        case MENU_TYPE.ALBUM_SPINE:
          menuOptions.subMenuType = MENU_TYPE.BOOKRACK_BACK;
          break;
        case MENU_TYPE.DELETED_ALBUM_SPINE:
          menuOptions.subMenuType = MENU_TYPE.DELETED_ALBUM_BACK;
          break;
        case MENU_TYPE.NORMAL_FRAME:
        case MENU_TYPE.EMPTY_FRAME:
        case MENU_TYPE.RESERVED_FRAME:
          menuOptions.subMenuType = MENU_TYPE.ALBUM_CONTENTS_BACK;
          break;
        case MENU_TYPE.DELETED_PHOTOS:
          menuOptions.subMenuType = MENU_TYPE.DELETED_ALBUM;
          break;
        default:
          break;
      }
      return menuSheet.show(parentWindow, target, menuOptions);
    } else {
      return windowsMenu.show(parentWindow, target, menuOptions);
    }
  }
};

