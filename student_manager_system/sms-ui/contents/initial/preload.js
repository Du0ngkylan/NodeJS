
(function() {
'use strict';

  // !!CAUTION!!
  //  This script is loaded in all windows.
  //  Be careful not to affect unexpected windows.


  // Prevent default drop action.
  document.addEventListener('dragover',function(event){
    event.preventDefault();
    return false;
  },false);
  document.addEventListener('drop',function(event){
    event.preventDefault();
    return false;
  },false);


  // For electron-dialogbox created window. This is contents of electron-dialogbox/preload.js
  let _dialog = require('electron-dialogbox/index-for-renderer').getInstance();
  if (_dialog) window.dialog = _dialog;



})();

