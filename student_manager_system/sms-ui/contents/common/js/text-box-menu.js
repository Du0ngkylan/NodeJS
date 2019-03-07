const goyoTextBoxMenu = (function() {
  'use strict';
  const { remote } = require('electron');
  const { Menu, MenuItem } = remote;
  var registeredFunction;

  function openTextBoxMenu(parent) {
    const template = [
      {role: 'undo', label: '元に戻す(&U)'},
      {type: 'separator'},
      {role: 'cut', label: '切り取り(&T)'},
      {role: 'copy', label: 'コピー(&C)'},
      {role: 'paste', label: '貼り付け(&P)'},
      {type: 'separator'},
      {role: 'delete', label: '削除(&D)'},
      {role: 'selectall', label: 'すべて選択(&A)'}
    ];
    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: remote.getCurrentWindow()
    });
  }

  function defaultCondition(evt) {
    let target = evt.target;
    if (target.nodeName==='INPUT' && target.getAttribute('type')==='text') {
      return true;
    //} else if (target.nodeName==='TEXTAREA') {
    //  return true;
    } else {
      return false;
    }
  }

  function addTextBoxMenuListener(classNameOrFunction=null) {
    let checkCondition = defaultCondition;
    if (typeof classNameOrFunction === 'string') {
      checkCondition = (e) => {
        return e.target.classList.contains(classNameOrFunction);
      }
    } else if (typeof classNameOrFunction === 'function') {
      checkCondition = classNameOrFunction;
    }

    registeredFunction = function(evt) {
      if (checkCondition(evt)) {
        evt.preventDefault();
        evt.stopPropagation();

        openTextBoxMenu();
      }
    };

    window.addEventListener('contextmenu', registeredFunction);
  }

  function removeTextBoxMenuListener() {
    if (registeredFunction) {
      window.removeEventListener('contextmenu', registeredFunction);
      registeredFunction = null;
    }
  }

  return {
    openTextBoxMenu,
    addTextBoxMenuListener,
    removeTextBoxMenuListener,
  }
})();
