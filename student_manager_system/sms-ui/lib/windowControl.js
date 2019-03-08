'use strict';

var electron = require('electron');
var Menu = electron.menu;
var app = electron.app;
var ipcMain = electron.ipcMain;
var dialog = electron.dialog;
var BrowserWindow = electron.BrowserWindow;

var winControl = {
  splashWindow: null,
  constructionWindow: null,
  bookrackWindow: null,
  bookrackoperationWindow: null,
  attributeListWindow: null,
  photoviewwindow: null,
  informationwindow: null,
  albumViewWindows: new Map(),
  photoListWindows: new Map(),
  mlitDesignWorkKnackWindow: new Map(),

  showSplashWindow: function () {
    this.splashWindow = new BrowserWindow({ width: 600, height: 300, show: false, frame: false });
    this.splashWindow.setMenu(null);
    this.splashWindow.loadURL('goyop:///contents/splash_window/index.html');
    this.splashWindow.once('ready-to-show', () => {
      this.splashWindow.show();
    });
  },

  showConstructionListWindow: function () {
    this.constructionWindow = new BrowserWindow({ width: 840, height: 600, show: false, resizable: false });
    this.constructionWindow.loadURL('goyop:///contents/school_window/index.html');
    this.constructionWindow.setMenu(null);
    this.constructionWindow.once('ready-to-show', () => {
      this.constructionWindow.show();

      // If this window was opened, close others.
      if (this.splashWindow) {
        this.splashWindow.close();
        this.splashWindow = null;
      }
    });
  },

  showBookrackWindow: function () {
    this.bookrackWindow = new BrowserWindow({ width: 820, height: 680, show: false });
    this.bookrackWindow.loadURL('goyop:///contents/bookrack_window/index.html');
    //this.bookrackWindow.setMenu(null);
    this.bookrackWindow.once('ready-to-show', () => {
      this.bookrackWindow.show();

      if (this.constructionWindow) {
        this.constructionWindow.close();
        this.constructionWindow = null;
      }
    });

    // If bookrackWindow was closed, then other windows are closed automatically.
    this.bookrackWindow.on('closed', () => {
      if (this.attributeListWindow) {
        this.attributeListWindow.close();
        this.attributeListWindow = null;
      }
      this.albumViewWindows.forEach(w => w.close());
      this.albumViewWindows.clear();
      this.photoListWindows.forEach(w => w.close());
      this.photoListWindows.clear();
    });

    this.attributeListWindow = new BrowserWindow({ width: 320, height: 570, show: false, resizable: false, x: 0, y: 0 });
    this.attributeListWindow.loadURL('goyop:///contents/photo_sortout_tool_window/index.html');
    this.attributeListWindow.setMenu(null);
    this.attributeListWindow.once('ready-to-show', () => {
      this.attributeListWindow.show();
    });
  },

  showBookrackOperationWindow: function () {
    // TODO: set albumName.
    this.bookrackoperationWindow = new BrowserWindow({ width: 780, height: 580, show: false, resizable: false });
    this.bookrackoperationWindow.loadURL('goyop:///contents/bookrack_operation_window/index.html');
    this.bookrackoperationWindow.setMenu(null);
    this.bookrackoperationWindow.once('ready-to-show', () => {
      this.bookrackoperationWindow.show();
    });
    this.bookrackoperationWindow.once('blur', () => {
      this.bookrackoperationWindow.close();
      this.bookrackoperationWindow = null;
    });
  },

  showAlbumViewWindow: function (albumId) {
    // TODO: set albumName.
    var avw = new BrowserWindow({ width: 640, height: 480, show: false, frame: false });
    avw.loadURL('goyop:///contents/album_view_window/index.html');
    avw.setMenu(null);
    avw.once('ready-to-show', () => {
      avw.show();
    });

    // Inform the window that which album will it show.
    avw.webContents.on('did-finish-load', () => {
      avw.webContents.executeJavaScript(`setTargetAlbum("${albumId}");`);
    });

    // add the window to list, and set auto delete from list if it closed.
    this.albumViewWindows.set(albumId, avw);
    avw.on('closed', () => {
      if (this.albumViewWindows.has(albumId)) {
        this.albumViewWindows.delete(albumId);
      }
    });
  },

  showPhotoListWindow: function (albumId) {
    var plw = new BrowserWindow({ width: 940, height: 700, show: false });
    plw.loadURL('goyop:///contents/photo_list_window/index.html');
    plw.setMenu(null);
    plw.once('ready-to-show', () => {
      plw.show();
    });

    // close related album_view_window.
    if (this.albumViewWindows.has(albumId)) {
      var win = this.albumViewWindows.get(albumId);
      this.albumViewWindows.delete(albumId);
      win.close();
    }

    // Inform the window that which album will it show.
    plw.webContents.on('did-finish-load', () => {
      //plw.webContents.executeJavaScript(`setTargetAlbum("${albumId}");`);
    });

    // add the window to list, and set auto delete from list if it closed.
    this.photoListWindows.set(albumId, plw);
    plw.on('closed', () => {
      if (this.photoListWindows.has(albumId)) {
        this.photoListWindows.delete(albumId);
      }
    });
  },

  showphotoviewwindow: function () {
    // TODO: set albumName.
    this.photoviewwindow = new BrowserWindow({ width: 1280, height: 960, show: false });
    this.photoviewwindow.loadURL('goyop:///contents/photo_view_window/index.html');
    this.photoviewwindow.setMenu(null);
    this.photoviewwindow.once('ready-to-show', () => {
      this.photoviewwindow.show();
    });
  },

  showinformationwindow: function () {
    // TODO: set albumName.
    this.informationwindow = new BrowserWindow({ width: 340, height: 400, show: false, resizable: false });
    this.informationwindow.loadURL('goyop:///contents/information_window/index.html');
    this.informationwindow.setMenu(null);
    this.informationwindow.once('ready-to-show', () => {
      this.informationwindow.show();
    });
  },

  showPrintDecorationSettingWindow: function () {
    this.printDecorationSettingWindow = new BrowserWindow({ width: 650, height: 410, show: false, resizable: false });
    this.printDecorationSettingWindow.setMenu(null);
    this.printDecorationSettingWindow.loadURL('goyop:///contents/print_decoration_setting_window/index.html');
    this.printDecorationSettingWindow.once('ready-to-show', () => {
      this.printDecorationSettingWindow.show();
    });
  },

  showLayoutSettingWindow: function () {
    this.layoutSettingWindow = new BrowserWindow({ width: 340, height: 255, show: false, resizable: false });
    this.layoutSettingWindow.setMenu(null);
    this.layoutSettingWindow.loadURL('goyop:///contents/layout_setting_window/index.html');
    this.layoutSettingWindow.once('ready-to-show', () => {
      this.layoutSettingWindow.show();
    });
  },

  showPrintSheetSettingWindow: function () {
    this.printSheetSettingWindow = new BrowserWindow({ width: 450, height: 315, show: false, resizable: false });
    this.printSheetSettingWindow.setMenu(null);
    this.printSheetSettingWindow.loadURL('goyop:///contents/print_sheet_setting_window/index.html');
    this.printSheetSettingWindow.once('ready-to-show', () => {
      this.printSheetSettingWindow.show();
    });
  },

  showAlbumPrintWindow: function () {
    this.albumPrintWindow = new BrowserWindow({ width: 744, height: 603, minHeight: 500, minWidth: 600, show: false });
    this.albumPrintWindow.setMenu(null);
    this.albumPrintWindow.loadURL('goyop:///contents/album_print_window/index.html');
    this.albumPrintWindow.once('ready-to-show', () => {
      this.albumPrintWindow.show();
    });
  },

  showPrintSettingWindow: function () {
    this.printSettingWindow = new BrowserWindow({ width: 330, height: 395, show: false, resizable: false });
    this.printSettingWindow.setMenu(null);
    this.printSettingWindow.loadURL('goyop:///contents/print_setting_window/index.html');
    this.printSettingWindow.once('ready-to-show', () => {
      this.printSettingWindow.show();
    });
  },

  showKnackSelectionWindow: function () {
    this.knackSelectionWindow = new BrowserWindow({ width: 800, height: 600, show: false, resizable: false, frame: false });
    this.knackSelectionWindow.loadURL('goyop:///contents/knack_selection_window/index.html');
    this.knackSelectionWindow.setMenu(null);
    this.knackSelectionWindow.once('ready-to-show', () => {
      this.knackSelectionWindow.show();

      // If this window was opened, close others.
      if (this.constructionWindow) {
        this.constructionWindow.close();
        this.constructionWindow = null;
      }
    });
  },

  showFrameInformatinWindow: function () {
    this.frameInformatinWindow = new BrowserWindow({ width: 580, height: 510, show: false, resizable: false });
    this.frameInformatinWindow.setMenu(null);
    this.frameInformatinWindow.loadURL('goyop:///contents/frame_information_window/index.html');
    this.frameInformatinWindow.once('ready-to-show', () => {
      this.frameInformatinWindow.show();
    });
  },

  showImageSizeSettingWindow: function () {
    this.imageSizeSettingWindow = new BrowserWindow({ width: 300, height: 200, show: false, resizable: false });
    this.imageSizeSettingWindow.setMenu(null);
    this.imageSizeSettingWindow.loadURL('goyop:///contents/image_size_setting_window/index.html');
    this.imageSizeSettingWindow.once('ready-to-show', () => {
      this.imageSizeSettingWindow.show();
    });
  },

  showAlbumLayoutSelectionWindow: function () {
    this.albumLayoutSelectionWindow = new BrowserWindow({ width: 742, height: 515, minHeight: 500, minWidth: 600, show: false, resizable: false });
    this.albumLayoutSelectionWindow.setMenu(null);
    this.albumLayoutSelectionWindow.loadURL('goyop:///contents/album_layout_selection_window/index.html');
    this.albumLayoutSelectionWindow.once('ready-to-show', () => {
      this.albumLayoutSelectionWindow.show();
    });
  },

  showJpegQualityWindow: function () {
    this.jpegQualityWindow = new BrowserWindow({ width: 375, height: 420, resizable: false, show: false });
    this.jpegQualityWindow.setMenu(null);
    this.jpegQualityWindow.loadURL('goyop:///contents/jpeg_quality_window/index.html');
    this.jpegQualityWindow.once('ready-to-show', () => {
      this.jpegQualityWindow.show();
    });
  },

  showPhotoFileInformationSelectionWindow: function () {
    this.photoFileInformationSelectionWindow = new BrowserWindow({ width: 580, height: 510, show: false, resizable: false });
    this.photoFileInformationSelectionWindow.setMenu(null);
    this.photoFileInformationSelectionWindow.loadURL('goyop:///contents/photo_file_information_selection_window/index.html');
    this.photoFileInformationSelectionWindow.once('ready-to-show', () => {
      this.photoFileInformationSelectionWindow.show();
    });
  },

  showPhotoInformationSelectionWindow: function () {
    this.photoInformationSelectionWindow = new BrowserWindow({ width: 450, height: 360, show: false, resizable: false });
    this.photoInformationSelectionWindow.setMenu(null);
    this.photoInformationSelectionWindow.loadURL('goyop:///contents/photo_information_selection_window/index.html');
    this.photoInformationSelectionWindow.once('ready-to-show', () => {
      this.photoInformationSelectionWindow.show();
    });
  },
  showViewerTargetSelectionWindow: function () {
    this.viewerTargetSelectionWindow = new BrowserWindow({ width: 795, height: 590, resizable: false, show: false });
    this.viewerTargetSelectionWindow.setMenu(null);
    this.viewerTargetSelectionWindow.loadURL('goyop:///contents/viewer_target_selection_window/index.html');
    this.viewerTargetSelectionWindow.once('ready-to-show', () => {
      this.viewerTargetSelectionWindow.show();
      this.viewerTargetSelectionWindow.webContents.openDevTools();
    });
  },

  showProhibitCharacterTranslateRuleWindow: function () {
    this.prohibitCharacterTranslateRuleWindow = new BrowserWindow({ width: 413, height: 525, resizable: false, show: false });
    this.prohibitCharacterTranslateRuleWindow.setMenu(null);
    this.prohibitCharacterTranslateRuleWindow.loadURL('goyop:///contents/prohibit_character_translate_rule_window/index.html');
    this.prohibitCharacterTranslateRuleWindow.once('ready-to-show', () => {
      this.prohibitCharacterTranslateRuleWindow.show();
    });
  },

  showKnackChangeWindow: function () {
    this.knackChangeWindow = new BrowserWindow({ width: 445, height: 255, resizable: false, show: false });
    this.knackChangeWindow.setMenu(null);
    this.knackChangeWindow.loadURL('goyop:///contents/knack_change_window/index.html');
    this.knackChangeWindow.once('ready-to-show', () => {
      this.knackChangeWindow.show();
    });
  },

  showIdenticalImageSearchWindow: function () {
    this.identicalImageSearchWindow = new BrowserWindow({ width: 201, height: 137, minimizable: false, resizable: false, show: false });
    this.identicalImageSearchWindow.setMenu(null);
    this.identicalImageSearchWindow.loadURL('goyop:///contents/identical_image_search_window/index.html');
    this.identicalImageSearchWindow.once('ready-to-show', () => {
      this.identicalImageSearchWindow.show();
      this.identicalImageSearchWindow.webContents.openDevTools();
    });
  },

  showEdittedImageSearchWindow: function () {
    this.edittedImageSearchWindow = new BrowserWindow({ width: 422, height: 188, minimizable: false, resizable: false, show: false });
    this.edittedImageSearchWindow.setMenu(null);
    this.edittedImageSearchWindow.loadURL('goyop:///contents/editted_image_search_window/index.html');
    this.edittedImageSearchWindow.once('ready-to-show', () => {
      this.edittedImageSearchWindow.show();
    });
  },

  showPcEnvironmentWindow: function () {
    this.pcEnvironmentWindow = new BrowserWindow({ width: 605, height: 582, minimizable: false, resizable: false, show: false });
    this.pcEnvironmentWindow.setMenu(null);
    this.pcEnvironmentWindow.loadURL('goyop:///contents/pc_environment_window/index.html');
    this.pcEnvironmentWindow.once('ready-to-show', () => {
      this.pcEnvironmentWindow.show();
    });
  },

  showAllAlbumLayoutChangingWindow: function () {
    this.allAlbumLayoutChangingWindow = new BrowserWindow({ width: 576, height: 567, minimizable: false, resizable: false, show: false });
    this.allAlbumLayoutChangingWindow.setMenu(null);
    this.allAlbumLayoutChangingWindow.loadURL('goyop:///contents/all_album_layout_changing_window/index.html');
    this.allAlbumLayoutChangingWindow.once('ready-to-show', () => {
      this.allAlbumLayoutChangingWindow.show();
    });
  },

  showStringSearchWindow: function () {
    this.stringSearchWindow = new BrowserWindow({ width: 516, height: 307, minimizable: false, resizable: false, show: false });
    this.stringSearchWindow.setMenu(null);
    this.stringSearchWindow.loadURL('goyop:///contents/string_search_window/index.html');
    this.stringSearchWindow.once('ready-to-show', () => {
      this.stringSearchWindow.show();
    });
  },

  showPhotoInformationSearchWindow: function () {
    this.photoInformationSearchWindow = new BrowserWindow({ width: 528, height: 500, minimizable: false, resizable: false, show: false });
    this.photoInformationSearchWindow.setMenu(null);
    this.photoInformationSearchWindow.loadURL('goyop:///contents/photo_information_search_window/index.html');
    this.photoInformationSearchWindow.once('ready-to-show', () => {
      this.photoInformationSearchWindow.show();
    });
  },

  showFilenameSearchWindow: function () {
    this.filenameSearchWindow = new BrowserWindow({ width: 520, height: 248, minimizable: false, resizable: false, show: false });
    this.filenameSearchWindow.setMenu(null);
    this.filenameSearchWindow.loadURL('goyop:///contents/filename_search_window/index.html');
    this.filenameSearchWindow.once('ready-to-show', () => {
      this.filenameSearchWindow.show();
    });
  },

  showBookrackSettingWindow: function () {
    this.bookrackSettingWindow = new BrowserWindow({ width: 529, height: 407, minimizable: false, resizable: false, show: false });
    this.bookrackSettingWindow.setMenu(null);
    this.bookrackSettingWindow.loadURL('goyop:///contents/bookrack_setting_window/index.html');
    this.bookrackSettingWindow.once('ready-to-show', () => {
      this.bookrackSettingWindow.show();
    });
  },

  showDeliverableDataInputWindow: function () {
    this.deliverableDataInputWindow = new BrowserWindow({ width: 700, height: 645, minimizable: false, resizable: false, show: false });
    this.deliverableDataInputWindow.setMenu(null);
    this.deliverableDataInputWindow.loadURL('goyop:///contents/deliverable_data_input_window/index.html');
    this.deliverableDataInputWindow.once('ready-to-show', () => {
      this.deliverableDataInputWindow.show();
    });
  },

  showDeliverableDataOutputWindow: function () {
    this.deliverableDataOutputWindow = new BrowserWindow({ width: 720, height: 645, minimizable: false, resizable: false, show: false });
    this.deliverableDataOutputWindow.setMenu(null);
    this.deliverableDataOutputWindow.loadURL('goyop:///contents/deliverable_data_output_window/index.html');
    this.deliverableDataOutputWindow.once('ready-to-show', () => {
      this.deliverableDataOutputWindow.show();
    });
  },

  showBookrackTreeviewWindow: function () {
    this.bookrackTreeviewWindow = new BrowserWindow({ width: 800, height: 600, minHeight: 260, minWidth: 280, show: false });
    this.bookrackTreeviewWindow.setMenu(null);
    this.bookrackTreeviewWindow.loadURL('goyop:///contents/bookrack_treeview_window/index.html');
    this.bookrackTreeviewWindow.once('ready-to-show', () => {
      this.bookrackTreeviewWindow.show();
    });
  },

  showMlitDesignWorkKnackWindow: function (page, property) {
    var mdwkw = new BrowserWindow({ width: 800, height: 600, show: false, resizable: false, frame: false });
    let loadHtml = 'index.html';
    if (page && 1 < page) {
      loadHtml = 'index' + page + '.html';
    }
    let loadUrl = 'goyop:///contents/mlit_design_work_knack_window/' + loadHtml;
    mdwkw.loadURL(loadUrl);
    mdwkw.setMenu(null);
    mdwkw.once('ready-to-show', () => {
      mdwkw.show();
    });
    
    // Inform the window of the page property.
    mdwkw.webContents.on('dom-ready', () => {
      mdwkw.webContents.executeJavaScript(`Page.setProperty('${page}', '${property}');`);
    });
    
    // If this window was opened, close others.
    this.mlitDesignWorkKnackWindow.forEach(w => w.close());
    this.mlitDesignWorkKnackWindow.clear();
    
    // Add the window to list, and set auto delete from list if it closed.
    this.mlitDesignWorkKnackWindow.set(page, mdwkw);
    mdwkw.on('closed', () => {
      if (this.mlitDesignWorkKnackWindow.has(page)) {
        this.mlitDesignWorkKnackWindow.delete(page);
      }
    });
  },
  
  showTestWindow: function () {
    this.testWindow = new BrowserWindow({ width: 450, height: 320, show: false });
    this.testWindow.setMenu(null);
    this.testWindow.loadURL('goyop:///contents/print_sheet_setting_window/index.html');
    this.testWindow.once('ready-to-show', () => {
      this.testWindow.show();
      this.testWindow.webContents.openDevTools();
    });
  },

};

module.exports = winControl;

