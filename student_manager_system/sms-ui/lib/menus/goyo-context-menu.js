'use strict';

// Electron modules.
const { Menu } = require('electron');


function setHandler(items, handler) {
  for (let item of items) {
    if (typeof item.submenu === 'object') {
      setHandler(item.submenu, handler);
    } else if (item.actionId !== undefined) {
      item.click = handler;
    } else {
    }
  }
}

const contextMenu = {

  popup(parent, menuItems) {
    return new Promise((resolve, reject) => {
      let selectedItem = null;

      setHandler(menuItems, (i, w, e) => {
        selectedItem = i;
      });

      let menu = Menu.buildFromTemplate(menuItems);
      menu.popup({
        window: parent,
        callback: () => { resolve(selectedItem); },
      });
    });
  },

  popupCb(parent, menuItems, callback) {
    // Because of electron's bug(https://github.com/electron/electron/issues/12451),
    // Use this function for popup context menu until 2.0.x is released.
    let selectedActionId = null;

    setHandler(menuItems, (i, w, e) => {
      console.log(`popup click: ${i.actionId}`);
      callback(i);
    });

    let menu = Menu.buildFromTemplate(menuItems);
    menu.popup({
      window: parent,
      callback: () => { console.log('popup closed'); },
    });
  },
};

module.exports = contextMenu;

