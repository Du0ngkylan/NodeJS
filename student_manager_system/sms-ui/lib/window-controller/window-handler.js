'use strict';

// Node.js modules.
const path = require('path');

// Electron modules.
const { BrowserWindow, ipcMain, protocol, screen } = require('electron');

// constant definitions.
const DEFAULT_OPTIONS = {
  center: true,
  show: false,
};
const DEFAULT_OPTIONS_WP = {
  webgl: false,
  webaudio: false,
};


// internal functions.
function makeOptions(userOptions) {
  var wp = Object.assign({}, DEFAULT_OPTIONS_WP, userOptions.webPreferences);
  var opt = Object.assign({}, DEFAULT_OPTIONS, userOptions);

  wp.preload = path.join(__dirname, '../../contents/initial/preload.js');
  opt.webPreferences = wp;
  return opt;
}

// store browser id of all photo_view_window
var photoviewIds = [];

// exported functions.
module.exports = {

  openInvisibleWindow: function (parent) {
    return new BrowserWindow({ parent: parent, show: false });
  },

  openWindow: function (url, bwSetting) {
    let win;
    let promise = new Promise((resolve, reject) => {
      bwSetting = makeOptions(bwSetting);
      win = new BrowserWindow(bwSetting);
      win.loadURL(url);
      win.setMenu(null);
      win.once('ready-to-show', () => {
        resolve(win);
      });
    });
    promise.browserWindow = win;
    return promise;
  },

  openConstructionWindow: function (parent, mode_) {
    let mode = (mode_ === 'onlyselection')
      ? 'onlyselection'
      : 'normal';

    return this.openWindow(
      `goyop:///contents/construction_window/index.html#mode.${mode}`,
      { width: 840, height: 600, show: false, resizable: false });
  },

  openBookrackListWindow: function (parent, constructionId, defaultBookrackId) {
    return this.openWindow(
      `goyop:///contents/bookrack_list_window/index.html?constructionId=${constructionId}&defaultBookrackId=${defaultBookrackId}`,
      { width: 840, height: 530, show: false, resizable: false });
  },

  openBookrackWindow: function (parent, constructionId=0, bookrackId, albumId, option={}) {
    let param = `constructionId=${constructionId}`;
    if (bookrackId!=null) {
      param += `&bookrackId=${bookrackId}`;
      if (albumId!=null) {
        param += `&albumId=${albumId}`;
      }
    }
    let w = option.windowWidth || 820;
    let h = option.windowHeight || 640;
    let x = option.windowX || null;
    let y = option.windowY || null;
    let isCenter = (x==null || y==null)?true:false;
    // 表示可能なディスプレイを探す
    if(!isCenter){
      let displays = screen.getAllDisplays();
      let inTarget = ((targetX, targetY, bounds)=>{
        if( bounds.x <= targetX && targetX < (bounds.x+bounds.width-100) &&
            bounds.y <= targetY && targetY < (bounds.y+bounds.height-100)
        ){
          return true;
        }else{
          return false;
        }
      });
      
      let gate = false;
      for(let display of displays){
        if( inTarget(x,y,display.bounds) ){
          gate = true;
          break;
        }
      }
      // もし、表示可能なディスプレイが無ければ、初期値に戻す。
      if(!gate){
        isCenter = true;
        w = 820;
        h = 640;
      }
    }

    if(!isCenter){
      return this.openWindow(
        `goyop:///contents/bookrack_window/index.html?${param}`,
        { 'minHeight': 576, 'minWidth': 760, width: w, height: h, x: x, y: y, show: false, parent: parent, frame: false, webPreferences: { webSecurity: false } });
    }else{
      return this.openWindow(
        `goyop:///contents/bookrack_window/index.html?${param}`,
        { 'minHeight': 576, 'minWidth': 760, width: w, height: h, center: true, show: false, parent: parent, frame: false, webPreferences: { webSecurity: false } });      
    }
  },

  openPhotoSortoutToolWindow: function (parent, constructionId = 'data') {
    return this.openWindow(
      `goyop:///contents/photo_sortout_tool_window/index.html?constructionId=${constructionId}`,
      { minWidth: 320, minHeight: 570, width: 320, height: 570, minimizable: false, show: false, parent: parent, resizable: false, x: 0, y: 0 });
  },

  openAlbumViewWindow: function (parent, constructionId = 'data', albumId = '0', option={}) {
    let param = `constructionId=${constructionId}&albumId=${albumId}`
    if (typeof option.frameIndex === 'number') {
      param += `&frameIndex=${option.frameIndex}`;
    } else if (typeof option.frameId === 'number') {
      param += `&frameId=${option.frameId}`;
    } else if (typeof option.page === 'number') {
      param += `&page=${option.page}`;
    }
    if (option.appeal) {
      param += `&appeal=${option.appeal}`;
    }

    let w = option.windowWidth || 850;
    let h = option.windowHeight || 600;

    return this.openWindow(
      `goyop:///contents/album_view_window/index.html?${param}`,
      { width: w, height: h, minWidth: 600, minHeight: 500, useContentSize: false, parent: parent, show: false, frame: false, webPreferences: { webSecurity: false } })
      .then(win => {
        if (option.windowMaximize) {
          win.maximize();
        }
        return win;
      });
  },

  openPhotoListWindow: function (parent, bookrackId, albumId) {
    return this.openWindow(
      `goyop:///contents/photo_list_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { width: 940, height: 700, parent: parent, show: false, webPreferences: { webSecurity: false } });
  },

  openPhotoViewWindow: function (parent, bookrackId, albumId, photoId, frameless, fullscreen, windowSettings, currentMode, scaleFlag, cropFlag) {
    ipcMain.once('new-photoview-openned', (event, id) => {
      photoviewIds.push(id);
    });
    
    // close all photo_view_window browser
    ipcMain.removeAllListeners('close-all-photoview-window');
    ipcMain.on('close-all-photoview-window', (event, arg) => {
      BrowserWindow.getAllWindows().forEach(window => {
        if (photoviewIds.includes(window.id)) {
          window.close();
        }
      });
      ipcMain.removeAllListeners('close-all-photoview-window');
    });
    return this.openWindow(
      `goyop:///contents/photo_view_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}&photoId=${photoId}`
      + `&windowType=${windowSettings.windowType}`
      + `&adjustImage=${windowSettings.adjustImage}`
      + `&centerScreen=${windowSettings.centerScreen}`
      + `&moveToCenter=${windowSettings.moveToCenter}`
      + `&fullType=${windowSettings.fullType}`
      + `&backColor=${windowSettings.backColor}`
      + `&imageSound=${windowSettings.imageSound}`
      + `&displayDate=${windowSettings.shootingDate.displayDate}`
      + `&dateFormat=${windowSettings.shootingDate.dateFormat}`
      + `&currentMode=${currentMode}`
      + `&scaleFlag=${scaleFlag}`
      + `&cropFlag=${cropFlag}`,
      {
        minWidth: 120, minHeight: 120, width: 1280, height: 960, parent: parent, show: false, frame: !frameless,
        titleBarStyle: (frameless === true ? 'hidden' : ''),
        fullscreen: fullscreen,
        resizable: !frameless,
        webPreferences: { webSecurity: false }
      });
  },

  openInformationWindow: function (parent, url, width, height) {
    return this.openWindow(
      url,
      { width: width, height: height, show: false, parent: parent, modal: true, resizable: false, useContentSize: true });
  },

  openPrintPreviewWindow: async function (parent) {
    let win = await this.openWindow(
      `goyop:///contents/print_preview_window/index.html`,
      { width: 744, height: 603, parent: parent, minHeight: 500, minWidth: 600, show: false });
    win.maximize();

    if (win.webContents.isLoading()) {
      await new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => { resolve(win); });
      });
    }

    return win;
  },

  openPrintSingleWindow: function (parent, bookrackId, albumId) {
    return this.openWindow(
      `goyop:///contents/print_single_window/print.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { show: false, webPreferences: { webSecurity: false } });
  },

  openPrintDoubleWindow: function (parent, bookrackId, albumId) {
    return this.openWindow(
      `goyop:///contents/print_double_window/print.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { show: false, webPreferences: { webSecurity: false } });
  },

  openPrintMultiLayoutWindow: function (parent, bookrackId, albumId) {
    return this.openWindow(
      `goyop:///contents/print_multilayout_window/print.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { show: false, webPreferences: { webSecurity: false } });
  },

  openBookrackTreeviewWindow: function (parent, constructionId) {
    ipcMain.on('ondragstart', (event, filePath) => {
      event.sender.startDrag({
        files: filePath,
        icon: '.../contents/common/images/mouse/move.png'
      })
    })
    return this.openWindow(
      `goyop:///contents/bookrack_treeview_window/index.html?constructionId=${constructionId}`,
      { useContentSize: true, width: 1000, height: 630, parent: parent, minHeight: 400, minWidth: 480, show: false, webPreferences: { webSecurity: false } });
  },

  openMenuSheetWindow: async function (parent) {
    let win = await this.openWindow(
      //return this.openWindow(
      'goyop:///contents/menu_sheet_window/index.html',
      { useContentSize: true, width: 706, height: 546, opacity: 0, transparent:true, parent: parent, minimizable: false, resizable: false, show: false, skipTaskbar: true, frame: false, webPreferences: { webSecurity: false, zoomFactor:1 } });

    if (win.webContents.isLoading()) {
      await new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => { resolve(win); });
      });
    }
    return win;
  },

  openFolderPathWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/folder_path_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openPhotoSortoutInformationRegisterWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/photo_sortout_information_register_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openKnackSettingFinishWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/knack_setting_finish_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openMlitDesignWorkKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/mlit_design_work_knack_window/index.html',
      { width: 800, height: 600, show: false, resizable: false, frame: false });
  },

  openMlitBuildingKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/mlit_building_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openGeneralCivilEngineeringWorkKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/general_civil_engineering_work_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },
  openNexcoKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/nexco_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openGeneralBuildingWorkKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/general_building_work_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openExpresswayKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/expressway_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openPopupUsageWindows: function (parent) {
    return this.openWindow(
      'goyop:///contents/common_usage/popup_menu.js.usage.html',
      { width: 450, height: 700, parent: parent, minimizable: false, resizable: false, show: false });
  },

  openContextMenuUsageWindows: function (parent) {
    return this.openWindow(
      'goyop:///contents/common_usage/context_menu.js.usage.html',
      { width: 450, height: 700, parent: parent, minimizable: false, resizable: false, show: false });
  },

  openMaffDesignWorkKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/maff_design_work_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openMaffFinishedBookKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/maff_finished_book_knack_window/index.html',
      { width: 800, height: 602, parent: parent, show: false, resizable: false, frame: false });
  },

  openAlbumBackupWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/album_backup_window/index.html',
      { width: 795, height: 590, parent: parent, resizable: false, show: false });
  },

  openMlitFinishedBookKnackWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/mlit_finished_book_knack_window/index.html',
      { width: 800, height: 600, show: false, resizable: false, frame: false });
  },

  openPhotoDetailWindow: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      `goyop:///contents/photo_detail_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}&photoId=${photoId}`,
      { useContentSize: true, width: 950, height: 600, parent: parent, show: false, webPreferences: { webSecurity: false } });
  },

  openAlbumBookmarkListWindow: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      'goyop:///contents/album_bookmark_list_window/index.html',
      { width: 800, height: 600, parent: parent, show: false, resizable: false });
  },

  openSimpleMessageWindow: async function (parent, title, message, inProgress = true, cancelCallback, modal = false) {
    let win = await this.openWindow(
      'goyop:///contents/simple_message_window/index.html',
      { width: 350, height: 170, parent: parent, modal: modal, show: false, resizable: false, minimizable: false, closable: false, movable: false });
    if (cancelCallback) {
      let callback = () => {
        setImmediate(cancelCallback);
        win.destroy();
        if (parent) {
          parent.focus();
        }
      };
      ipcMain.on('simple_message_window:cancel', callback);
      win.on('closed', () => ipcMain.removeListener('simple_message_window:cancel', callback));
    }

    if (win.webContents.isLoading()) {
      await new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => { resolve(win); });
      });
    }

    await win.webContents.executeJavaScript(`initialize("${title}", "${message}", ${(inProgress) ? 'true' : 'false'}, ${(cancelCallback) ? 'true' : 'false'});`);
    return win;
  },

  openSimpleMessageAndProgressWindow: async function (parent, title, message, inProgress = true, cancelCallback, modal = false) {
    let win = await this.openWindow(
      'goyop:///contents/simple_message_and_progress_window/index.html',
      { width: 350, height: 170, parent: parent, modal: modal, show: false, resizable: false, minimizable: false, closable: false, movable: false });
    if (cancelCallback) {
      let callback = () => {
        setImmediate(cancelCallback);
        win.destroy();
        if (parent) {
          parent.focus();
        }
      };
      ipcMain.on('simple_message_and_progress_window:cancel', callback);
      win.on('closed', () => ipcMain.removeListener('simple_message_and_progress_window:cancel', callback));
    }

    if (win.webContents.isLoading()) {
      await new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => { resolve(win); });
      });
    }

    await win.webContents.executeJavaScript(`initialize("${title}", "${message}", ${(inProgress) ? 'true' : 'false'}, ${(cancelCallback) ? 'true' : 'false'});`);
    return win;
  },

  openGoyoDebugWindow: function () {
    return this.openWindow(
      'file://' + __dirname + '/../../goyodebug/goyodebug.html',
      { useContentSize: true, x: 0, y: 0, center: false, width: 920, height: 300, show: false, frame: true, });
  },

  openPhotoMiniMapWindow: async function (parent, windowInfo, initialParam) {
    let paramString;
    let isFirst = true;
    for (let field in initialParam) {
      if (isFirst === true) {
        paramString = field + '=' + initialParam[field];
        isFirst = false;
      } else {
        paramString += '&' + field + '=' + initialParam[field];
      }
    }
    return this.openWindow(
      'goyop:///contents/photo_minimap_window/index.html' + (paramString == '' ? '' : ('?' + paramString)),
      { x: windowInfo.x, y: windowInfo.y, width: 103, height: 125, 
        minWidth:103, minHeight: 125, parent: parent, show: false, 
        resizable: false, minimizable: false, webPreferences: { webSecurity: false } });
  },
  getAllPhotoWindow: function(){
    let photoViewWindowsOpened = []
    for (let i = 0; i < photoviewIds.length; i++) {
      BrowserWindow.getAllWindows().forEach(window => {
        if (photoviewIds[i] === window.id) {
          photoViewWindowsOpened.push(window);
        }
      });
    }
    return photoViewWindowsOpened;
  }
};
