'use strict';

$(function() {
  // add left click event listener
  $('[data-context-menu-left-click]').each(function() {
    this.addEventListener('click', (e) => {
      e.preventDefault();

      let itemsKey = this.dataset.contextMenuLeftClick;
      ContextMenu.popup(itemsKey);
    }, false);
  });

  // add right click event listener
  $('[data-context-menu-right-click]').each(function() {
    this.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      let itemsKey = this.dataset.contextMenuRightClick;
      ContextMenu.popup(itemsKey);
    }, false);
  });
});

var ContextMenu = (function() {
  const {remote} = require('electron');
  const {Menu, MenuItem} = remote;
  const _menu = new Menu();
  let _items = {};

  function _popup(itemsKey) {
    _menu.clear();

    let items = _items[itemsKey];
    for (let i = 0; i < items.length; i++) {
      let menuItem = new MenuItem(items[i]);
      _menu.append(menuItem);
    }

    _menu.popup(remote.getCurrentWindow());
  }

  function _register(items) {
    _items = items;
  }

  return {
    popup: _popup,
    register: _register
  };
}());
