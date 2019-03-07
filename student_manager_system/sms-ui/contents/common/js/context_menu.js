'use strict';

const { Menu }  = require('electron').remote;

export default {
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
};


// Internal functions

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
