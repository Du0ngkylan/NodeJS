'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.
const { shell, nativeImage, BrowserWindow } = require('electron');


var windowDisabler = {
  disabledWindows: new Map(),

  inactivate(win) {
    console.log('inactivate', win.id);
    var prev = this.disabledWindows.get(win);
    if (prev) {
      prev.count++;
    } else {
      let miniWin = new BrowserWindow({width:1,height:1,parent:win,modal:true,show:true,frame:false, transparent:true});
      miniWin.setIgnoreMouseEvents(true);
      this.disabledWindows.set(win, { count: 1, miniWin: miniWin });
    }
  },

  activate(win) {
    console.log('activate', win.id);
    var prev = this.disabledWindows.get(win);
    assert(prev, "invalid usage.");

    if (prev.count > 1) {
      prev.count--;
    } else {
      prev.miniWin.destroy();
      this.disabledWindows.delete(win);
    }
  }
};

var plainImageMaker = {
  make(width, height, r, g, b, a) {
    return nativeImage
      .createFromBuffer(Buffer.from([b,g,r,a]), {width:1,height:1})
      .resize({width: width, height: height});
  }
};

var htmlOpener = {
  openManual() {
    // TODO: GOYO19にマニュアルを同梱、パスを修正
    shell.openItem('file:///C:/Program%20Files%20(x86)/GOYO18/Manual/index.html');
  },

  openSupportSite() {
    // TODO: LecreさんにURLを再確認
    shell.openItem('http://www.nec-solutioninnovators.co.jp/sl/goyoutashi/');
  },

  openGoyotashiSite() {
    // TODO: LecreさんにURLを再確認
    shell.openItem('http://www.kuraemon.com/rd/?from=goyo');
  },
};

module.exports = {
  windowDisabler,
  plainImageMaker,
  htmlOpener
};

