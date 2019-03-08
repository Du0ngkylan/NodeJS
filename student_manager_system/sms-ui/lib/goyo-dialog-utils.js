'use strict';

// Node.js modules.
const assert = require('assert');
var EventEmitter = require('events');
const path = require('path');

// Electron modules.
const { dialog, BrowserWindow } = require('electron');

// 3rd-party modules.
const eDialog = require('electron-dialogbox');

// goyo modules.

const KNACK_URLS = [
  '',
  'goyop:///contents/mlit_design_work_knack_window/index.html',                  // 1: 国土交通省：土木設計業務等
  'goyop:///contents/mlit_finished_book_knack_window/index.html',                // 2: 国土交通省：工事完成図書
  'goyop:///contents/mlit_building_knack_window/index.html',                     // 3: 国土交通省：営繕工事
  'goyop:///contents/maff_design_work_knack_window/index.html',                  // 4: 農林水産省：設計業務等
  'goyop:///contents/maff_finished_book_knack_window/index.html',                // 5: 農林水産省：工事完成図書
  'goyop:///contents/nexco_knack_window/index.html',                             // 6: NEXCO
  'goyop:///contents/expressway_knack_window/index.html',                        // 7: 首都高速道路
  'goyop:///contents/general_civil_engineering_work_knack_window/index.html',    // 8: 一般土木工事
  'goyop:///contents/general_building_work_knack_window/index.html',             // 9: 一般建築工事
];

function showDialog(url, opt, input) {
  let parent = opt.parent;
  if (parent) { parent.setEnabled(false); }
  if (typeof opt.webPreferences !== 'object') opt.webPreferences = {};
  if (opt.alwaysOnTop == null) opt.alwaysOnTop = false;
  opt.webPreferences.preload = path.join(__dirname, '../contents/initial/preload.js');

  let dialog = eDialog.showDialog(url, opt, input);
  
  // start of fixing error parent lost focus and flashing when closing dialog, ref #9855
  const Dialog = Object.getPrototypeOf(dialog);
  Dialog.exitSuccess = function (result) {
    this.isSuccess = true;
    this.result = result;
    if (this.options.parent) {
      this.options.parent.focus();
    }
    this.window.close();
  }

  Dialog.exitFailure = function (result) {
    this.isSuccess = false;
    this.result = result;
    if (this.options.parent) {
      this.options.parent.focus();
    }
    this.window.close();
  }
  // end of fixing error parent lost focus and flashing when closing dialog, ref #9855

  let p = dialog.resultPromise.then(r => { if (parent) parent.setEnabled(true); return r;});
  p.window = dialog.browserWindow;
  return p;
}

module.exports = {

  ////////////////////////////////
  // Message Box
  ////////////////////////////////

  showSimpleMessageDialog: function (parent, title, message, buttonText) {
    let option = {
      type: 'info',
      title: title,
      message: message,
      buttons: [buttonText],
      noLink: true,
      icon: 'info'
    };

    return new Promise((resolve, rejct) => {
      dialog.showMessageBox(parent, option, resolve);
    });
  },

  showErrorMessageDialog: function (parent, title, message, buttonText) {
    let option = {
      type: 'error',
      title: title,
      message: message,
      buttons: [buttonText],
      noLink: true,
      icon: 'error',
    };

    return new Promise((resolve, rejct) => {
      // Although I wanna use async mode,  it freezes all windows in few seconds. (is it bug of Electron?)
      // So, I use sync mode unwillingly.
      dialog.showMessageBox(parent, option);
      resolve();
    });
  },

  showWarningMessageDialog: function (parent, title, message, buttonText, cancelText = undefined) {
    let buttons = cancelText === undefined ? [buttonText] : [buttonText, cancelText];
    let option = {
      type: 'warning',
      title: title,
      message: message,
      buttons: buttons,
      noLink: true,
      icon: 'warning',
    };
    return new Promise((resolve, rejct) => {
      // Although I wanna use async mode,  it freezes all windows in few seconds. (is it bug of Electron?)
      // So, I use sync mode unwillingly.
      let result = dialog.showMessageBox(parent, option);
      resolve(result === 0);
    });
  },

  showSimpleBinaryQuestionDialog: function (parent, title, message, okText, cancelText, defaultIsOk) {
    let option = {
      type: 'question',
      title: title,
      message: message,
      buttons: [okText, cancelText],
      noLink: true,
      defaultId: (defaultIsOk) ? 0 : 1,
      cancelId : (defaultIsOk) ? 0 : 1,
      icon: 'question',
    };

    return new Promise((resolve, rejct) => {
      let result = dialog.showMessageBox(parent, option);
      resolve(result === 0);
    });
  },

  showSimpleBinaryWarningDialog: function (parent, title, message, okText, cancelText, defaultIsOk) {
    let option = {
      type: 'warning',
      title: title,
      message: message,
      buttons: [okText, cancelText],
      noLink: true,
      defaultId: (defaultIsOk) ? 0 : 1,
      icon: 'warning',
    };

    return new Promise((resolve, rejct) => {
      let result = dialog.showMessageBox(parent, option);
      resolve(result === 0);
    });
  },

  showSimpleMessageAndButtons: function (parent, title, message, buttonLabels, buttonCallback, width=350, height=150) {
    let promise;
    let notifier = {
      closed: false,
      clicked(buttonIndex) {
        if (typeof buttonCallback === 'function') {
          buttonCallback(buttonIndex);
        }
      },
      close() {
        this.closed = true;
        this.emit('finish');
      },
    };
    Object.setPrototypeOf(notifier, EventEmitter.prototype);

    promise = showDialog(
      'goyop:///contents/simple_message_and_button_window/index.html',
      { width: width, height: height, modal: true, parent: parent, minimizable: false, resizable: false, show: true, title: title},
      { message, buttonLabels, clickNotifier: notifier });

    promise.close = () => {
      notifier.close();
    };
    return promise;
  },

  showDeleteConfirmDialog: function (parent, initialParam) {
    let width = 548;
    let height = 192;
    return showDialog(
      'goyop:///contents/delete_confirm_dialog/index.html',
      { width: width, height: height, modal: true, parent: parent, minimizable: false, resizable: false, show: true, title: initialParam.title},
      initialParam);
  },

  showDuplicateDialog: function (parent, initialParam) {
    let width = 334; 
    let height = 152;
    return showDialog(
      'goyop:///contents/duplicate_dialog/index.html', 
      {width: width, height: height, modal: true, parent: parent, minimizable: false, resizable: false, show: true, }, 
      initialParam);
  },

  showMergeAlbumsDialog: function (parent, target) {
    let width = 450;
    let height = 192;
    return showDialog(
      'goyop:///contents/merge_albums_dialog/index.html',
      { width: width, height: height, modal: true, parent: parent, minimizable: false, resizable: false, show: true, },
      target);
  },

  ////////////////////////////////
  // Data setting dialogs
  ////////////////////////////////

  showProgramSettingDialog: async function (parent, initialSetting) {
    return showDialog(
      'goyop:///contents/program_setting_window/index.html',
      { width: 528, height: 405, modal: true, parent: parent, minimizable: false, resizable: false, show: false, },
      initialSetting);
  },

  showBookrackSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/bookrack_setting_window/index.html',
      /* { width: 529, height: 407, parent: parent, modal: true, minimizable: false, resizable: false, show: false }, */
      { width: 529, height: 470, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showAlbumSettingDialog: async function (parent, mode, albumDetail, photoInfoLabels=null) {
    if (!photoInfoLabels) {
      photoInfoLabels = ['写真-大分類', '写真区分', '工種', '種別', '細別'];
    }
    return showDialog(
      'goyop:///contents/album_setting_window/index.html',
      { width: 574, height: 507, parent: parent, modal: true, minimizable: false, resizable: false, show: false, webPreferences: { webSecurity: false }  },
      { mode, albumDetail, photoInfoLabels });
  },

  showAllAlbumLayoutChangingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/all_album_layout_changing_window/index.html',
      { width: 576, height: 555, parent: parent, modal: true, minimizable: false, resizable: false, show: false, webPreferences: { webSecurity: false }  },
      initialParam);
  },

  showAlbumLayoutSelectionDialog: async function (parent, layoutInfo) {
    return showDialog(
      'goyop:///contents/album_layout_selection_window/index.html',
      { width: 742, height: 515, parent: parent, modal: true, minHeight: 500, minWidth: 600, show: false, resizable: false, webPreferences: { webSecurity: false } },
      { layoutInfo });
  },

  showJpegQualityDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/jpeg_quality_window/index.html',
      { width: 375, height: 420, parent: parent, modal: true, resizable: false, show: false },
      initialParam);
  },

  showBoxSettingDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/box_setting_window/index.html',
      { width: 409, height: 193, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showBookrackAddWindowDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/bookrack_add_window/index.html',
      { width: 409, height: 150, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },
  showAdjustPageNumberAlbumDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/adjust_page_number_album_window/index.html',
      { width: 399, height: 120, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  ////////////////////////////////
  // Knack selection relative dialogs.
  ////////////////////////////////

  showPhotoSortoutInformationCreateDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/photo_sortout_information_create_window/index.html',
      { width: 653, height: 575, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showAddressSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/address_selection_window/index.html',
      { width: 392, height: 330, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showBusinessFieldSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/business_field_selection_window/index.html',
      { width: 630, height: 357, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showBusinessKeywordSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/business_keyword_selection_window/index.html',
      { width: 513, height: 358, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showWaterlineRoadRegisterDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/waterline_road_register_window/index.html',
      { width: 490, height: 443, parent: parent, modal: true, show: false, resizable: false, minimizable: false },
      initialParam);
  },

  showWaterlineRoadCodeSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/waterline_road_code_selection_window/index.html',
      { width: 568, height: 349, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showConstructionFieldSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/construction_field_selection_window/index.html',
      { width: 270, height: 330, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showConstructionIndustrySelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/construction_industry_selection_window/index.html',
      { width: 270, height: 330, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showConstructionTypeSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/construction_type_selection_window/index.html',
      { width: 270, height: 330, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showConstructionMethodSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/construction_method_selection_window/index.html',
      { width: 392, height: 330, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showContracteeSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/contractee_selection_window/index.html',
      { width: 630, height: 355, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showKnackNotchangeAlertPop: async function (parent) {
    return showDialog(
      'goyop:///contents/knack_notchange_alert_pop/index.html',
      { width: 400, height: 160, modal: true, parent: parent, minimizable: false, resizable: false, show: false, });
  },

  showDivisionSelectionDialog: function (parent, pattern = 1) {
    return showDialog(
      'goyop:///contents/division_selection_window/index.html',
      { width: 652, height: 430, parent: parent, show: false, resizable: false, minimizable: false },
      { pattern });
  },

  showKuraemonDriveListDialog: function (parent, list,type) {
    const option = {list,type}
    return showDialog(
      'goyop:///contents/kuraemondrive_list_window/index.html',
      { width: 400, height: 250, parent: parent, show: false, resizable: false, minimizable: false,}, option);
  },

  ////////////////////////////////
  // Search dialogs.
  ////////////////////////////////

  showPhotoInformationSearchDialog: async function (parent, knackType, actionPrint) {
    return showDialog(
      'goyop:///contents/photo_information_search_window/index.html',
      { width: 528, height: 515, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      {knackType, actionPrint});
  },

  showStringSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/string_search_window/index.html',
      { width: 516, height: 315, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showFilenameSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/filename_search_window/index.html',
      { width: 520, height: 248, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showIdenticalImageSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/identical_image_search_window/index.html',
      { width: 201, height: 137, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showEdittedImageSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/editted_image_search_window/index.html',
      { width: 422, height: 188, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showSearchResultControlDialog: function (parent, itemList, onSelectCallback=(index, item)=>{}) {
    let listener = {
      async select(idx) {
        if (typeof onSelectCallback === 'function') {
          return await onSelectCallback(idx, itemList[idx]);
        }
      },
    };

    return showDialog(
      'goyop:///contents/search_result_control_window/index.html',
      { width: 385, height: 155, parent: parent, minimizable: false, resizable: false, show: false, alwaysOnTop: true },
      { itemList: itemList, onSelectListener: listener });
  },

  showIdenticalPhotoDeleteWindow: function (parent, itemList, onChangeSelectCallback=(idx,isSelect)=>{}, onDeleteCallback=(indices)=>{}) {
    let listener = {
      async selectItem(idx, isSelected) {
        if (typeof onChangeSelectCallback === 'function') {
          await onChangeSelectCallback(idx, isSelected);
        }
      },
      async deleteItems(indices) {
        if (typeof onDeleteCallback === 'function') {
          await onDeleteCallback(indices);
        }
      },
    };

    return showDialog(
      'goyop:///contents/identical_photo_delete_window/index.html',
      { width: 639, height: 145, parent: parent, minimizable: false, resizable: false, show: false, alwaysOnTop: true },
      { itemList: itemList, eventListener: listener });
  },

  ////////////////////////////////
  // Photo frame dialogs.
  ////////////////////////////////

  showPhotoInformationDialog: async function (parent, knack, albumFrame, history, constructionId, albumId, photoInfoTags) {
    return showDialog(
      'goyop:///contents/photo_information_window/index.html',
      { width: 685, height: 430, useContentSize: false, parent: parent, modal: true, show: false, resizable: false },
      { knack, albumFrame, history, constructionId, albumId, photoInfoTags });
  },

  showFrameInformationDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/frame_information_window/index.html',
      { width: 580, height: 510, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showPhotoFileInformationSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/photo_file_information_selection_window/index.html',
      { width: 580, height: 510, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showPhotoInformationSelectionDialog: async function (parent, knackId, photoInfoTags) {
    return showDialog(
      'goyop:///contents/photo_information_selection_window/index.html',
      { width: 450, height: 375, parent: parent, modal: true, show: false, resizable: false },
      { knackId, photoInfoTags });
  },

  showReferenceSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/reference_setting_window/index.html',
      { width: 480, height: 270, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showPhotoSavingSelectionDialog: async function (parent) {
    return showDialog(
      'goyop:///contents/photo_saving_selection_window/index.html',
      { width: 374, height: 185, parent: parent, modal: true, show: false, resizable: false });
  },

  ////////////////////////////////
  // Image editing dialogs.
  ////////////////////////////////

  showImageSizeSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/image_size_setting_window/index.html',
      { width: 300, height: 200, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showClipartSelectionDialog: async function (parent) {
    return showDialog(
      'goyop:///contents/clipart_selection_window/index.html',
      { width: 732, height: 500, parent: parent, show: false, resizable: false, minimizable: false, webPreferences: { webSecurity: false } });
  },

  showClipartEdittingDialog: async function (parent, baseImage=null, initialTextDirection='horizontal') {
    return showDialog(
      'goyop:///contents/clipart_editting_window/index.html',
      { width: 600, height: 392, parent: parent, show: false, resizable: false, minimizable: false, webPreferences: { webSecurity: false } },
      { baseImage, initialTextDirection } );
  },

  showTransparencySettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/transparency_setting_window/index.html',
      { width: 345, height: 142, parent: parent, modal: true, show: false, resizable: false, minimizable: false },
      initialParam);
  },

  showSplitAlbumDialog: async function (parent, albumname, newAlbumName, splitPageNumber, maxPageNumber ) {
    return showDialog(
      'goyop:///contents/split_album_dialog/index.html',
      { width: 385, height: 193, parent: parent, modal: true, show: false, resizable: false, minimizable: false },
      {albumname, newAlbumName, splitPageNumber, maxPageNumber});
  },

  showPhotoSizeChangeDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/photo_size_change_window/index.html',
      { width: 240, height: 180, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  ////////////////////////////////
  // Print setting dialogs.
  ////////////////////////////////
  showPrintSettingDialog: async function (parent, maxPages, printerName, printerSize, orientation, pageRenumbering, spool, isDuplexPrint) {
    return showDialog(
      'goyop:///contents/print_setting_window/index.html',
      { width: 330, height: 395, parent: parent, modal: true, show: false, resizable: false },
      { maxPages, printerName, printerSize, orientation, pageRenumbering, spool, isDuplexPrint });
  },

  showPrintLayoutSettingDialog: async function (parent, printLayoutSettings) {
    return showDialog(
      'goyop:///contents/print_layout_setting_window/index.html',
      { width: 340, height: 255, parent: parent, modal: true, show: false, resizable: false },
      { printLayoutSettings });
  },

  showPrintDecorationSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/print_decoration_setting_window/index.html',
      { width: 650, height: 410, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showPrintSheetSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/print_sheet_setting_window/index.html',
      { width: 450, height: 315, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },



  ////////////////////////////////
  // Construction setting dialogs.
  ////////////////////////////////

  showConstructionSelectionDialog: function (parent) {
    return showDialog(
      'goyop:///contents/knack_selection_window/index.html',
      { width: 800, height: 600, parent: parent, show: false, resizable: false, frame: false, backgroundColor: '#d5e1eb' },
      { mode: 'create' });
  },

  showConstructionInformationDialog: function (parent, mode = "edit", knackType, knackId) {
    assert(mode === 'edit' || mode === 'show');

    if (knackType < 1 || 9 < knackType) {
      throw new Exception('Unknown knack type specified.');
    }

    return showDialog(
      KNACK_URLS[knackType],
      { width: 800, height: 600, parent: parent, show: false, resizable: false, frame: false },
      { mode, knackType, knackId });
  },

  showGoyo18DatamigrationAlertDialog: function (parent, title = "警告",
                                                message = "警告メッセージ\nthis is message",
                                                content = "警告メッセージ警告メッセージ警告メッセージ",
                                                needCancel = true,
                                                windowType) {
    return showDialog(
      'goyop:///contents/goyo18_datamigration_alert_window/index.html',
      { width: 600, height: 340, parent: parent, show: false, resizable: false },
      { title, message, content, needCancel ,windowType});
  },

  ////////////////////////////////
  // Progress dialogs.
  ////////////////////////////////
  showProgressDialog: function (parent, cancelCallback) {
    let winHeight = 132;
    let browserWindow;
    let promise;
    let notifier = {
      ratio: 0,
      finished: false,
      setProgress(r) {
        this.ratio = r;
        browserWindow.send('progress', r);
      },
      cancel() {
        if (typeof cancelCallback === 'function') {
          cancelCallback();
          cancelCallback = null;
        }
      },
      close() {
        this.finished = true;
        browserWindow.send('finish');
        return promise;
      },
      canceling(){
      }
    };

    let useCancelButton = (typeof cancelCallback === 'function');
    if (useCancelButton) {
      winHeight = 165;
    }

    promise = showDialog(
      'goyop:///contents/progress_window/index.html',
      { width: 135, height: winHeight, parent: parent, show: false, modal: true, resizable: false, minimizable: false, frame: false },
      { notifyCancel: useCancelButton, progressNotifier: notifier });
    browserWindow = promise.window;

    return notifier;
  },

  showProgressDialog2: function(parent) {
    let emitterFrom = new EventEmitter();
    let emitterTo = new EventEmitter();
    let prepends = [];
    let promise = showDialog(
      'goyop:///contents/progress_window2/index.html',
      { width: 372, height: 212, parent: parent, show: false, modal: true, resizable: false, minimizable: false, frame: false }, // height: 212
      { progress: emitterTo });

    emitterTo.once('newListener', (event, listener) => {
      console.log('emitterTo activated');
      for(let e of prepends) {
        process.nextTick(function() {
          if(!emitterTo.emit('content', e)) {
            console.log('delay emit failed');
          }
          else {
            console.log('delay emit succeed');
          }
        });
      }
    });
    emitterFrom.on('content', obj => {
      process.nextTick(function() {
        if(!emitterTo.emit('content', obj)) {
          prepends.push(obj);
          console.log('emit failed, push to prepends');
        }
        else {
          console.log('emit succeed');
        }
      });
    });

    emitterFrom.on('finish', () => {
      emitterTo.emit('finish');
    });

    emitterTo.on('ready', () => {
      emitterFrom.emit('ready');
    });

    return { emitter: emitterFrom, promise: promise };
  },
  showProgressMovieDialog: function (parent, cancelCallback) {
    let promise;
    let browserWindow;
    let notifier = {
      ratio: 0,
      constructionName: null,
      finished: false,
      setProgressName(constructionName) {
        if(constructionName !== undefined && constructionName !== null) {
          this.constructionName = constructionName;
        }
      },
      setProgress(r) {
        this.ratio = r;
        browserWindow.send('progress', r);
      },
      cancel(currentWindow) {
        cancelCallback(currentWindow);
      },
      close() {
        this.finished = true;
        browserWindow.send('finish');
        return promise;
      },
      canceling(){
        browserWindow.send('canceling');
      }
    };

    let useCancelButton = (typeof cancelCallback === 'function');

    promise = showDialog(
      'goyop:///contents/progress_movie_window/index.html',
      { width: 795, height: 590, parent: parent, show: false, modal: true, resizable: false, minimizable: false, frame: false },
      { notifyCancel: useCancelButton, progressNotifier: notifier });
    browserWindow = promise.window;

    return notifier;
  },


  ////////////////////////////////
  // Unorganized dialogs.
  ////////////////////////////////
  showCompartmentCreateWindow: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/compartment_create_window/index.html',
      { width: 409, height: 193, show: false, parent: parent, modal: true, resizable: false },
      initialParam);
  },

  showBookmarkCreateWindow: async function (parent, initialName='') {
    return showDialog(
      'goyop:///contents/bookmark_create_window/index.html',
      { width: 275, height: 130, show: false, parent: parent, modal: true, resizable: false }, 
      { bookmarkName: initialName} );
  },

  showInformationDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/information_window/index.html',
      { width: 340, height: 400, show: false, parent: parent, modal: true, resizable: false },
      initialParam);
  },

  showProhibitCharacterTranslateRuleDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/prohibit_character_translate_rule_window/index.html',
      { width: 413, height: 525, parent: parent, modal: true, resizable: false, show: false },
      initialParam);
  },

  showKnackChangeDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/knack_change_window/index.html',
      { width: 445, height: 255, parent: parent, modal: true, resizable: false, show: false },
      initialParam);
  },

  showKnackCorinsTecrisPopup: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/knack_corins_tecris_popup_window/index.html',
      { width: 723, height: 589, parent: parent, modal: true, resizable: false, show: false },
      initialParam);
  },

  showPcEnvironmentDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/pc_environment_window/index.html',
      { width: 605, height: 582, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showPlainImageCreatingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/plain_image_creating_window/index.html',
      { width: 318, height: 139, parent: parent, modal: true, resizable: false, minimizable: false, show: false },
      initialParam);
  },

  showAlbumBackupDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/album_backup_window/index.html',
      { width: 795, height: 590, parent: parent, modal: true, resizable: false, show: false },
      initialParam);
  },

  showViewerTargetSelectionDialog: function (parent) {
    return showDialog(
      'goyop:///contents/viewer_target_selection_window/index.html',
      { width: 795, height: 590, parent: parent, modal: true, resizable: false, show: false });
  },

  showConstructionCopyDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/construction_copy_window/index.html',
      { width: 554, height: 230, parent: parent, show: false, resizable: false, minimizable: false }, initialParam);
  },

  showCopyOldConstructionDialog: function (parent,goyoMigrationModule) {
    return showDialog(
      'goyop:///contents/goyo18_construction_window/index.html',
      { width: 795, height: 520, parent: parent, show: false, resizable: false, minimizable: false },
      {goyoMigrationModule});
  },

  showNewConstructionSelectionDialog: function (parent) {
    return showDialog(
      'goyop:///contents/new_construction_selection/index.html',
      { width: 385, height: 155, parent: parent, show: false, resizable: false, minimizable: false });
  },

  showFolderSelectionDialog: function (parent, windowTitle, defalut, filters, multi) {

    return new Promise((resolve, reject) => {
      let properties2 = '';
      if (multi === true) {
        properties2 = 'multiSelections';
      }
      dialog.showOpenDialog(parent, {
        title: windowTitle,
        defaultPath: defalut,
        properties: ['openDirectory', properties2],
        filters: filters
      }, (fileNames) => {
        console.log(fileNames);
        resolve(fileNames);
      });
    });
  },

  showOpenFileSelectionDialog: function (parent, windowTitle, defalut, filters, multi) {

    return new Promise((resolve, reject) => {

      let properties2 = '';
      if (multi === true) {
        properties2 = 'multiSelections';
      }
      dialog.showOpenDialog(parent, {
        title: windowTitle,
        defaultPath: defalut,
        properties: ['openFile', properties2],
        filters: filters
      }, (fileNames) => {
        console.log(fileNames);
        resolve(fileNames);
      });
    });
  },

  showSaveFileSelectionDialog: function (parent, windowTitle, defalut, filters) {

    return new Promise((resolve, reject) => {

      dialog.showSaveDialog(parent, {
        title: windowTitle,
        defaultPath: defalut,
        filters: filters
      }, (fileNames) => {
        console.log(fileNames);
        resolve(fileNames);
      });
    });
  },

  showSplitMessageDialog: async function (parent, path ) {
    return showDialog(
      'goyop:///contents/split_deliverable_dialog/index.html',
      { width: 590, height: 165, parent: parent, modal: true, show: false, resizable: false, minimizable: false },
      {path});
  },

  showProhibitCharacterTranslateRuleSettingDialog: function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/prohibit_character_translate_rule_setting_window/index.html',
      { width: 330, height: 150, parent: parent, show: false, resizable: false, minimizable: false }, initialParam);
  },

  showAlbumMoveDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/album_move_window/index.html',
      { width: 470, height: 270, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showLicenseRegisterDialog: async function (mode='PRODUCT') {
    return showDialog(
      'goyop:///contents/license_register_window/index.html',
      { width: 800, height: 600, parent: null, show: false, resizable: false, frame: false },
      { mode: mode });
  },

  showLicenseRestrictionDialog: function (parent, mode=1, option={}) {
    if (mode <= 9) {
      var title = '体験版　機能制限';
    } else {
      var title = 'Standard版　機能制限';
    }

    return showDialog(
      'goyop:///contents/license_restriction_window/index.html',
      { width: 450, height: 280, modal: true, parent: parent, minimizable: false, resizable: false, show: true, title: title, },
      { mode, option });
  },

  showRestoreConstructionPathDialog: async function (parent,initialParam) {
    return showDialog(
      'goyop:///contents/restore_construction_path_window/index.html',
      { width: 590, height: 160, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showDeliverableDataInputDialog: function (parent) {
    return showDialog(
      'goyop:///contents/deliverable_data_input_window/index.html',
      { width: 840, height: 600, parent: parent, minimizable: false, resizable: false, show: false });
  },

  showDeliverableDataOutputDialog: function (parent, bookrackId, albumId) {
    return showDialog(
      `goyop:///contents/deliverable_data_output_window/index.html?bookrackId=${bookrackId}&albumId=${albumId}`,
      { width: 840, height: 600, parent: parent, minimizable: false, resizable: false, show: false });
  },
  showAlbumLockBusyDialog: async function(parent) {
    await this.showWarningMessageDialog(
      parent,
      require('./goyo-app-defaults').DIALOG_TITLE, 
      `このアルバムは他のコンピュータで使用中のため、\nこの操作を行うことはできません。`,
      'OK');
  },
  showConstructionShareLockBusyDialog: async function(parent) {
    await this.showWarningMessageDialog(
      parent,
      require('./goyo-app-defaults').DIALOG_TITLE, 
      `この工事は他のコンピュータで使用中のため、\nこの操作を行うことはできません。`,
      'OK');
  },
  showConstructionLockBusyDialog: async function(parent) {
    await this.showWarningMessageDialog(
      parent,
      require('./goyo-app-defaults').DIALOG_TITLE, 
      `この工事は他のコンピュータで更新中のため、\n現在この操作を行うことはできません。\nしばらく待ってから、再度操作して下さい。`,
      'OK');
  },
  showCopyPasteDialog: function (parent,isCopy) {
    return showDialog(
      'goyop:///contents/copy_paste_dialog/index.html',
      { width: 295, height: 140, parent: parent, show: false, resizable: false, minimizable: false },
      {isCopy: isCopy});
  },
};
