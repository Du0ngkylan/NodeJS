'use strict';

// Node.js modules.
const path = require('path');

// Electron modules.
const { BrowserWindow } = require('electron');


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
  var opt  = Object.assign({}, DEFAULT_OPTIONS, userOptions);

  wp.preload = path.join(__dirname,'../../contents/initial/preload.js');
  opt.webPreferences = wp;
  return opt;
}


// exported functions.
module.exports = {

  openInvisibleWindow: function (parent) {
    return new BrowserWindow({ parent: parent, show: false });
  },

  openWindow: function (url, bwSetting) {
    return new Promise((resolve, reject) => {
      bwSetting = makeOptions(bwSetting);
      let win = new BrowserWindow(bwSetting);
      win.loadURL(url);
      win.setMenu(null);
      win.once('ready-to-show', () => {
        resolve(win);
      });
    });
  },

  openSplashWindow: function () {
    return this.openWindow(
      'goyop:///contents/splash_window/index.html',
      { width: 600, height: 300, show: false, frame: false });
  },

  openConstructionWindow: function (parent, mode_) {
    let mode = (mode_ === 'onlyselection')
      ? 'onlyselection'
      : 'normal';

    return this.openWindow(
      `goyop:///contents/school_window/index.html#mode.${mode}`,
      { width: 840, height: 600, show: false, resizable: false });
  },

  openBookrackWindow: function (parent, constructionId='data') {
    return this.openWindow(
      `goyop:///contents/bookrack_window/index.html?constructionId=${constructionId}`,
      { 'minHeight': 576, 'minWidth': 710, width: 820, height: 640, show: false, parent: parent, frame: false, webPreferences:{webSecurity:false}});
  },

  openPhotoSortoutToolWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/photo_sortout_tool_window/index.html',
      { width: 320, height: 570, show: false, parent: parent, resizable: false, x: 0, y: 0 });
  },

  openAlbumViewWindow: function (parent, constructionId='data', albumId='0') {
    return this.openWindow(
      `goyop:///contents/album_view_window/index.html?constructionId=${constructionId}&albumId=${albumId}`,
      { width: 856, height: 460, useContentSize: false, parent: parent, show: false, frame: false, webPreferences: {webSecurity:false} })
      .then(win => {
        return win;
      });
  },

  openPhotoListWindow: function (parent, bookrackId, albumId) {
    return this.openWindow(
      `goyop:///contents/photo_list_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { width: 940, height: 700, parent: parent, show: false });
  },

  openOperationWindow: function (parent, type) {
    return this.openWindow(
      `goyop:///contents/bookrack_operation_window/index.html#${type}`,
      { width: 780, height: 580, show: false, parent: parent, resizable: false })
      .then(win => {
        win.once('blur', () => { win.close(); });
        return win;
      });
  },

  openPhotoViewWindow: function (parent, bookrackId, albumId, photoId, frameless, fullscreen) {
    return this.openWindow(
      `goyop:///contents/photo_view_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}&photoId=${photoId}`,
      { width: 1280, height: 960, parent: parent, show: false, frame: !frameless,
        titleBarStyle: (frameless === true ? 'hidden': ''),
        fullscreen: fullscreen,
        webPreferences: {webSecurity:false} });
  },

  openInformationWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/information_window/index.html',
      { width: 340, height: 400, show: false, parent: parent, modal: true, resizable: false });
  },

  openPrintPreviewWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/print_preview_window/index.html',
      { width: 744, height: 603, parent: parent, minHeight: 500, minWidth: 600, show: false });
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

  openKnackChangeWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/knack_change_window/index.html',
      { width: 445, height: 255, parent: parent, resizable: false, show: false });
  },

  openDeliverableDataInputWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/deliverable_data_input_window/index.html',
      { width: 840, height: 600, parent: parent, minimizable: false, resizable: false, show: false });
  },

  openBookrackTreeviewWindow: function (parent, constructionId) {
    return this.openWindow(
      `goyop:///contents/bookrack_treeview_window/index.html?constructionId=${constructionId}`,
      { width: 800, height: 600, parent: parent, minHeight: 260, minWidth: 280, show: false });
  },

  openDeliverableDataOutputWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/deliverable_data_output_window/index.html',
      { width: 840, height: 600, parent: parent, minimizable: false, resizable: false, show: false });
  },

  openOperationWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/operation_window/index.html',
      { width: 706, height: 546, parent: parent, minimizable: false, resizable: false, show: false, frame: false });
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

  openIdenticalPhotoDeleteWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/identical_photo_delete_window/index.html',
      { width: 639, height: 145, parent: parent, minimizable: false, resizable: false, show: false });
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

  openPhotoMinimapWindow: function (parent) {
    return this.openWindow(
      'goyop:///contents/photo_minimap_window/index.html',
      { width: 108, height: 130, parent: parent, minimizable: false, resizable: false, show: false, title: '' });
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
      'goyop:///contents/photo_detail_window/index.html',
      { width: 800, height: 600, parent: parent, show: false });
  },

  openAlbumBookmarkListWindow: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      'goyop:///contents/album_bookmark_list_window/index.html',
      { width: 800, height: 600, parent: parent, show: false, resizable: false });
  },

  openClipartSelectionWindow: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      'goyop:///contents/clipart_selection_window/index.html',
      { width: 732, height: 500, parent: parent, show: false, resizable: false, minimizable: false });
  },

  openClipartEdittingWindow: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      'goyop:///contents/clipart_editting_window/index.html',
      { width: 600, height: 360, parent: parent, show: false, resizable: false, minimizable: false });
  },

  openNewConstruction: function (parent, bookrackId, albumId, photoId) {
    return this.openWindow(
      'goyop:///contents/new_construction_selection/index.html',
      { width: 390, height: 156, parent: parent, show: false, resizable: false, minimizable: false });
  },

  openSimpleMessageWindow: async function (parent, title, message, inProgress=true) {
    let win = await this.openWindow(
      'goyop:///contents/simple_message_window/index.html',
      { width: 400, height: 200, parent: parent, show: false, resizable: false, minimizable: false, closable: false, movable: false });

    if (win.webContents.isLoading()) {
      await new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => { resolve(win); });
      });
    }

    await win.webContents.executeJavaScript(`initialize("${title}", "${message}", ${(inProgress)?'true':'false'});`);
    return win;
  },

  openGoyoDebugWindow: function () {
    return this.openWindow(
      'file://'+__dirname+'/../../test/goyodebug/goyodebug.html',
      { useContentSize: true, width: 920, height: 300, show: false, frame: true, });
  },

};
