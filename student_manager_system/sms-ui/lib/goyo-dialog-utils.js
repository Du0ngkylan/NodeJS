'use strict';

// Node.js modules.
const assert = require('assert');
var EventEmitter = require('events');
const path = require('path');

// Electron modules.
const { dialog, BrowserWindow } = require('electron');

// 3rd-party modules.
const eDialog = require('electron-dialogbox');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const { windowHandler } = require('./goyo-window-controller');


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
  if (typeof opt.webPreferences !== 'object') opt.webPreferences = {};
  opt.webPreferences.preload = path.join(__dirname, '../contents/initial/preload.js');
  return eDialog.showDialog(url, opt, input);
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
    };

    return new Promise((resolve, rejct) => {
      // Although I wanna use async mode,  it freezes all windows in few seconds. (is it bug of Electron?)
      // So, I use sync mode unwillingly.
      dialog.showMessageBox(parent, option);
      resolve();
    });
  },

  showSimpleBinaryQuestionDialog: function (parent, title, message, okText, cancelText, defaultIsOk) {
    let option = {
      type: 'question',
      title: title,
      message: message,
      buttons: [okText, cancelText],
      // TODO: アイコンを変更する  icon: 
      noLink: true,
      defaultId: (defaultIsOk) ? 0 : 1,
    };

    return new Promise((resolve, rejct) => {
      let result = dialog.showMessageBox(parent, option);
      resolve(result === 0);
    });
  },

  showDeleteConfirmDialog: function (parent, initialParam) {
    let width = 548;
    let height = 192;
    if (initialParam) {
      if (initialParam.width) {
        width = initialParam.width;
      }
      if (initialParam.height) {
        height = initialParam.height;
      }
    }
    return showDialog(
      'goyop:///contents/delete_confirm_dialog/index.html',
      { width: width, height: height, modal: true, parent: parent, minimizable: false, resizable: false, show: true, },
      initialParam);
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
      { width: 529, height: 407, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showAlbumSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/album_setting_window/index.html',
      { width: 574, height: 507, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showAllAlbumLayoutChangingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/all_album_layout_changing_window/index.html',
      { width: 576, height: 567, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showAlbumLayoutSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/album_layout_selection_window/index.html',
      { width: 742, height: 515, parent: parent, modal: true, minHeight: 500, minWidth: 600, show: false, resizable: false },
      initialParam);
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

  ////////////////////////////////
  // Search dialogs.
  ////////////////////////////////

  showPhotoInformationSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/photo_information_search_window/index.html',
      { width: 528, height: 500, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
      initialParam);
  },

  showStringSearchDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/string_search_window/index.html',
      { width: 516, height: 307, parent: parent, modal: true, minimizable: false, resizable: false, show: false },
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

  showSearchResultControlDialog: function (parent, emitter, photoList) {
    return showDialog(
      'goyop:///contents/search_result_control_window/index.html',
      { width: 325, height: 128, parent: parent, minimizable: false, resizable: false, show: false },
      { emitter: emitter, photoList: photoList });
  },

  ////////////////////////////////
  // Photo frame dialogs.
  ////////////////////////////////

  showPhotoInformationDialog: async function (parent, knack, frame, frames) {
    return showDialog(
      'goyop:///contents/photo_information_window/index.html',
      { width: 685, height: 390, useContentSize: false, parent: parent, modal: true, show: false, resizable: false },
      { knack, frame, frames });
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

  showPhotoInformationSelectionDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/photo_information_selection_window/index.html',
      { width: 450, height: 302, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showReferenceSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/reference_setting_window/index.html',
      { width: 450, height: 250, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showPhotoSavingSelectionDialog: async function (parent) {
    return showDialog(
      'goyop:///contents/photo_saving_selection_window/index.html',
      { width: 400, height: 216, parent: parent, modal: true, show: false, resizable: false });
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

  showClipartSelectionDialog: async function (parent, initialParam) {
  },

  showClipartEdittingDialog: async function (parent, initialParam) {
  },

  showTransparencySettingDialog: async function (parent, initialParam) {
  },


  ////////////////////////////////
  // Print setting dialogs.
  ////////////////////////////////

  showPrintSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/print_setting_window/index.html',
      { width: 330, height: 395, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
  },

  showLayoutSettingDialog: async function (parent, initialParam) {
    return showDialog(
      'goyop:///contents/layout_setting_window/index.html',
      { width: 340, height: 255, parent: parent, modal: true, show: false, resizable: false },
      initialParam);
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
      { width: 800, height: 600, parent: parent, show: false, resizable: false, frame: false },
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


  ////////////////////////////////
  // Unorganized dialogs.
  ////////////////////////////////

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
      { width: 554, height: 204, parent: parent, show: false, resizable: false, minimizable: false }, initialParam);
  },

  showNewConstructionSelectionDialog: function (parent) {
    return showDialog(
      'goyop:///contents/new_construction_selection/index.html',
      { width: 385, height: 155, parent: parent, show: false, resizable: false, minimizable: false });
  },

  showTransparencySettingDialog: function (parent) {
    return showDialog(
      'goyop:///contents/transparency_setting_window/index.html',
      { width: 342, height: 130, parent: parent, show: false, resizable: false, minimizable: false });
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

  ////////////////////////////////
  // Progress dialogs.
  ////////////////////////////////
  showProgressDialog: async function (parent, notifyCancel, total) {
    let emitter = new EventEmitter();
    let breakPoint = false;
    let count = 0;
    let promise = showDialog(
      'goyop:///contents/progress_window/index.html',
      { width: 70, height: 74, parent: parent, show: false, modal: true, resizable: false, minimizable: false, frame: false },
      { notifyCancel: notifyCancel, progress: emitter });

    emitter.on('cancel', (cnt) => {
      breakPoint = true;
      count = cnt;
    })

    for (let i = 0; i < total; i++) {
      if (!breakPoint) {
        await new Promise((resolve) => {
          setTimeout(() => { resolve(); }, 30);
        });
        if (i == total - 1) {
          emitter.emit('finish');
        } else {
          emitter.emit('progress', i, total);
        }
      }
    }

    await promise;
    return count;
  },
};

