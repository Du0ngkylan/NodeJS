'use strict';

// Node.js modules.
const EventEmitter = require('events');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

// Electron modules.
const { app } = require('electron');

// 3rd-parth modules.
const fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppFolder = require('./goyo-appfolder');
const goyoAppDefaults = require('./goyo-app-defaults');
const goyoConstructionOperation = require('./goyo-construction-operation');
const { directoryWalk } = require('./goyo-utils');
const logger = require('./goyo-log')('goyo-settings-operation');
const { windowHandler } = require('./goyo-window-controller');
const lockFactory= require('./lock-manager/goyo-lock-manager');

const BOOKRACK_ITEM_TYPE_BOOKRACK = 0;
const BOOKRACK_ITEM_TYPE_COMPARTMENT = 1;
const BOOKRACK_ITEM_TYPE_BOX = 2;
const BOOKRACK_ITEM_TYPE_ALBUM = 3;

const HDD_ROOT_NUM = 2;

let appDataFolder = goyoAppFolder.getAppFolder();
var settingsOperation = {

  MAX_CREATE_ALBUM : 100,

  editProgramSetting: async function (parent) {
    // this function is moved into goyo-program-settings.js
  },

  editPhotoFileInformationSetting: async function (parent) {
    // this function is moved into goyo-program-settings.js
  },

  editBookrackSetting: async function (parent, constructionId) {
    let messageWindow;

    try {
      let construction = (await bookrackAccessor.getConstructionDetail(constructionId)).construction;
      this._debugLog('construction', construction);
      let settings = await bookrackAccessor.getConstructionSettings(constructionId);

      let currentSetting = {
        "knack" : construction.knack,
        "constructionSettings" : settings.constructionSettings,
        "photoInformationTags" : ["","","","","","",""],
      };
      let oldDataDir = this._getConstructionFolder(construction, settings.constructionSettings);
      settings.constructionSettings.dataFolder = oldDataDir;

      // 一般建築のみ、写真整理情報タグが編集可能
      if (construction.hasOwnProperty("photoInformationTags")) {
        currentSetting.photoInformationTags = construction.photoInformationTags;
      }

      //let currentSetting = dummyData(1 /* checkbox:0 or 1 */, 561);
      //currentSetting = dummyData(1, 31);
      //currentSetting = dummyData(1, 76);
      this._debugLog("currentSetting:", currentSetting);
      let newSetting = await goyoDialog.showBookrackSettingDialog(parent, currentSetting);
      if (!newSetting) { // do nothing if users clicked 'cancel'.
        return false;
      }
      this._debugLog("newSetting:", newSetting);

      let newConstructionSettings = newSetting.constructionSettings;

      let photoInfoTagWasChanged = false;
      let dataFolderWasChanged = false;
      if (oldDataDir !== settings.constructionSettings.dataFolder) {

        let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
          "質問", "本当に、データフォルダを" + newConstructionSettings.dataFolder +
        "\nに移動してよろしいですか?\n\n" + "　　《注意》\n" + "　　外付けHDDを指定する場合は常に同じドライブ名で\n" + "　　接続されている必要があります。",
        "はい", "いいえ", true);

        if (result) {
          let defaultFolder = goyoAppFolder.getAppFolder();
          try {
            var isFromStandardToExternalAndFromExternalStandard = (
              newConstructionSettings.dataFolder === defaultFolder ||
              oldDataDir === defaultFolder
            )
            if (isFromStandardToExternalAndFromExternalStandard) {
              let lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
              await lockManager.lockConstruction(false);
              // release all lock
              await lockManager.finalize();
              await lockFactory.waitConstructionUnLockAll();
            }
          } catch (error) {
            logger.error('Failed to lockManager.', error)
          }
          construction.dataFolder = newConstructionSettings.dataFolder;
          dataFolderWasChanged = true;
          this._debugLog('change folder', construction.dataFolder);

          if (defaultFolder === newConstructionSettings.dataFolder) {
            construction.dataFolder = await bookrackAccessor.getNewConstructionFolder(defaultFolder);
            construction.isExternalFolder = false;
            construction.isSharedFolder = false;
          } else {
            construction.dataFolder = newConstructionSettings.dataFolder;
            construction.isExternalFolder = true;
            construction.isSharedFolder = true;
          }
          this._debugLog('new folder', construction.dataFolder);
          messageWindow = await windowHandler.openSimpleMessageWindow(parent, goyoAppDefaults.DIALOG_TITLE, `工事「${construction.constructionName}」のデータフォルダを移動しています...`);
          messageWindow.show();
        } else {
          newConstructionSettings.dataFolder = oldDataDir;
        }
      }

      await bookrackAccessor.updateConstructionSettings(constructionId, newConstructionSettings);

      if (construction.hasOwnProperty("photoInformationTags")) {
        construction.photoInformationTags = newSetting.photoInformationTags;
        photoInfoTagWasChanged = true;
        logger.debug('has photoInformationTags');
      }

      if (photoInfoTagWasChanged || dataFolderWasChanged) {
        let progressWindow = goyoDialog.showProgressDialog(parent);
        let progress = (e,d,t,w) => {
          progressWindow.setProgress(d / t);
        };
        try {
          await bookrackAccessor.updateConstruction(construction, progress);
        } finally {
          await progressWindow.close();
        }
      }

      if (dataFolderWasChanged) {
        try {     
          await goyoConstructionOperation.updateSharedConstructionSettings(construction);
          let lockManager = await lockFactory.makeLockManagerByConstructionId(construction.constructionId);
          await lockManager.lockConstruction(true);
        } catch (error) {
          logger.error('Failed to lockManager.', error)
        }
        await goyoDialog.showSimpleMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          'データフォルダの移動が完了しました', 'OK');
      }

      this.emit('changeBookrackSetting', constructionId, dataFolderWasChanged);

      return true;

    } catch (e) {
      logger.error('failed to editBookrackSetting', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, '本棚の設定が更新できません。',
        'OK');
    } finally {
      if (messageWindow) {
        messageWindow.destroy();
      }
    }
    return false;
  },

  _getConstructionFolder : function (construction, constructionSettings) {
    if (constructionSettings.dataFolder === '') {
      let parent = path.dirname(construction.dataFolder);
      if (parent === appDataFolder) {
        return appDataFolder;
      } else {
        return construction.dataFolder
      }
    }
    return constructionSettings.dataFolder;
  },

  // BOX
  editBoxSetting: async function (parent, constructionId, boxId) {
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let boxItem = this.findBookrackItem(result.bookrackItems, boxId);
      // let currentSetting = result.boxSettings;
      if (!boxItem.bookrackItem) return false;

      let newSetting = await goyoDialog.showBoxSettingDialog(parent, boxItem.bookrackItem);
      if (!newSetting) { // Do nothing if users clicked 'cancel'.
        return false;
      }

      let updateResult = await bookrackAccessor.updateBookrackItem(constructionId, newSetting);
      if (updateResult.bookrackItemId == undefined) {
        logger.info('error when updating box settings');
        return false;
      }

      this.emit('changeBoxSetting', constructionId, boxId);
      return true;
    } catch(e) {
      logger.log('failed to editBoxSetting', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'BOXが編集できません。',
        'OK');
    }
    return false;
  },

  findBookrackItem: function (bookrackItems, bookrackItemId, parentId = undefined) {
    if(bookrackItems !== undefined && Array.isArray(bookrackItems)) {
      let result = {bookrackItem: null, parentBookrackItemId: null};
      bookrackItems.every(bookrackItem => {
        if (bookrackItem.bookrackItemId === bookrackItemId) {
          result.parentBookrackItemId = parentId;
          result.bookrackItem = bookrackItem;
          return false;
        } else {
          if (bookrackItem.bookrackItems !== undefined) {
            result = this.findBookrackItem(bookrackItem.bookrackItems, bookrackItemId, bookrackItem.bookrackItemId);
            if (result.bookrackItem !== null) {
              return false;
            }
          }
        }
        return true;
      });
      return result;
    }
    return null;
  },

  updateBookrackItems: function (bookrackItems, deleteBookrackItem, updateBookrackItems) {
    if(bookrackItems != undefined && Array.isArray(bookrackItems)) {
      let result;
      bookrackItems.every(bookrackItem => {
        if (bookrackItem.bookrackItemId === deleteBookrackItem.bookrackItemId) {
          let deleteItemIndex = this._indexOfChildItem(bookrackItems, deleteBookrackItem);
          bookrackItems.splice(deleteItemIndex, 1);
          let _array = [deleteItemIndex, 0];
          [].push.apply(_array, updateBookrackItems);
          [].splice.apply(bookrackItems, _array);
          result = true;
          return false;
        } else {
          if (bookrackItem.bookrackItems != undefined) {
            result = this.updateBookrackItems(bookrackItem.bookrackItems, deleteBookrackItem, updateBookrackItems);
            if (result != undefined) {
              return false;
            }
          }
        }
        return true;
      });
      return result;
    }
    return false;
  },

  deleteBox: async function (parent, constructionId, boxId) {
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let boxItem = this.findBookrackItem(result.bookrackItems, boxId);
      if (!boxItem.bookrackItem) return false;

      let isDeleteBox = await goyoDialog.showSimpleBinaryQuestionDialog(
        parent,
        "確認",
        'BOX「' + boxItem.bookrackItem.bookrackItemName + '」を削除します。\nよろしいですか？',
        "はい(&Y)", "いいえ(&N)", false);
      // Do nothing if users clicked 'いいえ(N)'.
      if (isDeleteBox) {
        if('bookrackItems' in boxItem.bookrackItem){
          let albumItems = boxItem.bookrackItem.bookrackItems;
          let isUpdate = this.updateBookrackItems(result.bookrackItems, boxItem.bookrackItem, albumItems);
          if(isUpdate){
            await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
          }
        }
        let deleteResult = await this.deleteEmptyContainer(constructionId, boxId);
        return deleteResult;
      }
    } catch(e) {
      logger.error('failed to deleteBox', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'BOXが削除できません。',
        'OK');
    }
    return false;
  },

  createBox: async function (parent, constructionId, albumIds) {
    // This function assumes that the following conditions have been satisfied.
    //  * All target album is not in any box.
    //  * All target album is in same compartment or same bookrack.
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let albumId = albumIds[0];

      let findItem = this.findBookrackItem(result.bookrackItems, albumId);
      let albumItem = findItem.bookrackItem;
      let parentId = findItem.parentBookrackItemId;
      if (!albumItem) return false;


      let newSetting = {};
      newSetting.bookrackItemId = 0;
      newSetting.colorType = 2;
      newSetting.bookrackItemName = "新しいBOX";
      newSetting = await goyoDialog.showBoxSettingDialog(parent, newSetting);
      if (!newSetting) { // Do nothing if users clicked 'cancel'.
        return false;
      }

      // Creat BOX
      newSetting.bookrackItemType = BOOKRACK_ITEM_TYPE_BOX;
      newSetting.displayNumber = albumItem.displayNumber;
      newSetting.parentBookrackItemId = parentId;
      newSetting.specialType = 0;
      newSetting.bookrackItemFolder = '';
      let newBoxItem = await bookrackAccessor.updateBookrackItem(constructionId, newSetting);

      // Move BOX and album
      result = await bookrackAccessor.getBookrackItems(constructionId);
      let boxItem = this.findBookrackItem(result.bookrackItems, newBoxItem.bookrackItemId);
      boxItem.bookrackItem.bookrackItems = [];
      let parentBookrackItems = this.findBookrackItem(result.bookrackItems, parentId);
      for(let id of albumIds){
        let findItem = this.findBookrackItem(result.bookrackItems, id);
        let albumItem = JSON.parse(JSON.stringify(findItem.bookrackItem));
        boxItem.bookrackItem.bookrackItems.push(albumItem);
        let deleteItemIndex = this._indexOfChildItem(parentBookrackItems.bookrackItem.bookrackItems, albumItem);
        if(deleteItemIndex !== -1 && id !== albumId){
          parentBookrackItems.bookrackItem.bookrackItems.splice(deleteItemIndex, 1);
        }
      }
      // display number sort
      boxItem.bookrackItem.bookrackItems.sort(function(a,b){
        if(a.displayNumber<b.displayNumber) return -1;
        if(a.displayNumber>b.displayNumber) return 1;
        return 0;
      });

      let isUpdate = this.updateBookrackItems(result.bookrackItems, albumItem, boxItem.bookrackItem);
      if(isUpdate){
        await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
        this.emit('changeBookrackItems');
        return true;
      }
    } catch (e) {
      logger.error('filed to createBox', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'BOXが作成できません。',
        'OK');
    }
    return false;
  },
  createBoxFromSetting: async function (boxSetting, constructionId, albumIds) {
    // This function assumes that the following conditions have been satisfied.
    //  * All target album is not in any box.
    //  * All target album is in same compartment or same bookrack.
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let albumId = albumIds[0];

      let findItem = this.findBookrackItem(result.bookrackItems, albumId);
      let albumItem = findItem.bookrackItem;
      let parentId = findItem.parentBookrackItemId;
      if (!albumItem) return false;

      // Creat BOX
      boxSetting.bookrackItemId = 0;
      boxSetting.bookrackItemType = BOOKRACK_ITEM_TYPE_BOX;
      boxSetting.displayNumber = albumItem.displayNumber;
      boxSetting.parentBookrackItemId = parentId;
      boxSetting.specialType = 0;
      boxSetting.bookrackItemFolder = '';
      let newBoxItem = await bookrackAccessor.updateBookrackItem(constructionId, boxSetting);

      // Move BOX and album
      result = await bookrackAccessor.getBookrackItems(constructionId);
      let boxItem = this.findBookrackItem(result.bookrackItems, newBoxItem.bookrackItemId);
      boxItem.bookrackItem.bookrackItems = [];
      let parentBookrackItems = this.findBookrackItem(result.bookrackItems, parentId);
      for(let id of albumIds){
        let findItem = this.findBookrackItem(result.bookrackItems, id);
        let albumItem = JSON.parse(JSON.stringify(findItem.bookrackItem));
        boxItem.bookrackItem.bookrackItems.push(albumItem);
        let deleteItemIndex = this._indexOfChildItem(parentBookrackItems.bookrackItem.bookrackItems, albumItem);
        if(deleteItemIndex !== -1 && id !== albumId){
          parentBookrackItems.bookrackItem.bookrackItems.splice(deleteItemIndex, 1);
        }
      }
      let isUpdate = this.updateBookrackItems(result.bookrackItems, albumItem, boxItem.bookrackItem);
      if(isUpdate){
        await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
        return newBoxItem.bookrackItemId;
      }
    } catch (e) {
      logger.error('filed to createBox', e);
    }
    return false;
  },

  _indexOfChildItem : function(bookrackItems, childItem) {
    let ret = -1;
    bookrackItems.some(function(item, index) {
      if (item.bookrackItemId === childItem.bookrackItemId) {
        ret = index;
        return true;
      }
    });
    return ret;
  },

  editBoxByTemplate: async function(parent, constructionId, bookrackId, templateTag){
    var _getAlbumSettings = async function(bookrackItems, parentBookrackItemId = undefined){
      let resultAlbum = {albumSettings:[], albumItems:[], compartmentAndBoxes:[]};
      for(let bookrackItem of bookrackItems){
        var isAlbum = (parseInt(bookrackItem.bookrackItemType) === BOOKRACK_ITEM_TYPE_ALBUM &&
            parseInt(bookrackItem.specialType) !== 1);
        if (isAlbum) {
          let albumId = bookrackItem.bookrackItemId;
          let albumSetting = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
          resultAlbum.albumSettings.push(albumSetting);
          bookrackItem.parentBookrackItemId = parentBookrackItemId;
          resultAlbum.albumItems.push(bookrackItem);
        } else {
          var isBookrackItems = (bookrackItem.hasOwnProperty('bookrackItems'));
          if(isBookrackItems){
            if (bookrackItem.bookrackItemType === BOOKRACK_ITEM_TYPE_COMPARTMENT
               || bookrackItem.bookrackItemType === BOOKRACK_ITEM_TYPE_BOX) {
              resultAlbum.compartmentAndBoxes.push(bookrackItem);
            }
            let childResult = await _getAlbumSettings(bookrackItem.bookrackItems, bookrackItem.bookrackItemId)
            Array.prototype.push.apply(resultAlbum.albumSettings, childResult.albumSettings);
            Array.prototype.push.apply(resultAlbum.albumItems, childResult.albumItems);
            Array.prototype.push.apply(resultAlbum.compartmentAndBoxes, childResult.compartmentAndBoxes);
          }
        }
      }
      return resultAlbum;
    };
    var _createBox = async function(boxTemplate){
      let newBoxSetting = {};
      newBoxSetting.bookrackItemId = 0;
      newBoxSetting.colorType = 1;
      newBoxSetting.bookrackItemType = BOOKRACK_ITEM_TYPE_BOX;
      newBoxSetting.parentBookrackItemId = bookrackId;
      let promise = boxTemplate.map(async function(boxName){
        newBoxSetting.bookrackItemName = boxName;
        let newBoxItem = await bookrackAccessor.updateBookrackItem(constructionId, newBoxSetting);
      });
      await Promise.all(promise);
    }
    var _moveAlbum = function(bookrackItems, albumItems, albumSettings){
      for(let i in albumSettings){
        let template = albumSettings[i].albumDetail.albumSettings.photoInfoTemplate[templateTag];
        let boxItem = bookrackItems.filter(function(d){
          return (parseInt(d.bookrackItemType) === BOOKRACK_ITEM_TYPE_BOX &&
            d.bookrackItemName === template)});
        if(boxItem.length > 0){
          boxItem[0].bookrackItems.push(albumItems[i]);
        }else{
          bookrackItems.push(albumItems[i]);
        }
      }
      let specialTypeTrueItem = bookrackItems.filter((d) => parseInt(d.specialType) === 1);
      bookrackItems = bookrackItems.filter((d) => parseInt(d.specialType) !== 1);
      Array.prototype.push.apply(bookrackItems, specialTypeTrueItem);
    }

    let result = await bookrackAccessor.getBookrackItems(constructionId);
    let findBookrackItem = await bookrackAccessor.getBookrackById(result.bookrackItems, bookrackId);
    let resultAlbumSettings = await _getAlbumSettings(findBookrackItem.bookrackItems);
    let albumSettings = resultAlbumSettings.albumSettings;
    let albumItems = resultAlbumSettings.albumItems;
    let compartmentAndBoxes = resultAlbumSettings.compartmentAndBoxes;
    let boxTemplate = [];
    let chkExistenceTemplate = albumSettings.every(albumSetting =>{
      let photoInfoTemplateSetting = albumSetting.albumDetail.albumSettings.photoInfoTemplate;
      let template = photoInfoTemplateSetting[templateTag];
  
      var isCreatBOX = (template !== '' && boxTemplate.indexOf(template) === -1);
      if(isCreatBOX){
        boxTemplate.push(template);
      }
      if(albumSettings[albumSettings.length-1] === albumSetting){
        if(boxTemplate.length === 0){
          // When the template is not registered
          return false;
        }
      }
      return true;
    });
    if(!chkExistenceTemplate){
      // If template is not registered, it displays a message and ends processing.
      await goyoDialog.showSimpleMessageDialog(
        parent, "情報",
        'BOXを作成するための情報が登録されているアルバムが見つからないため\n' +
        'BOXを作成してアルバムを整頓することができませんでした。',
        "OK");
      return false;
    }else{
      let isEditBoxByTemplate = await goyoDialog.showSimpleBinaryWarningDialog(
        parent,
        "警告",
        'この操作を実行すると、作成されているBOXを削除して作り直します。\n' +
        'また、BOXにアルバムを整頓した結果、アルバムの順序も変わります。\n' +
        '実行してもよろしいですか？',
        "はい(Y)", "いいえ(N)", false);
      // Do nothing if users clicked 'いいえ(N)'.
      if (isEditBoxByTemplate) {
        // Create BOX
        await _createBox(boxTemplate);
        // Move Album
        let newBookrackItems = await bookrackAccessor.getBookrackItems(constructionId);
        let findNewBookrackItem = await bookrackAccessor.getBookrackById(newBookrackItems.bookrackItems, bookrackId);
        // BOX and BookrackItem(specialType = 1)
        findNewBookrackItem.bookrackItems = findNewBookrackItem.bookrackItems.filter(function(d){
          let specialType = parseInt(d.specialType);
          let bookrackItemType = parseInt(d.bookrackItemType);
          let oldContainer = compartmentAndBoxes.some((item)=>{
            return item.bookrackItemId === d.bookrackItemId
          });
          return (!oldContainer && bookrackItemType === BOOKRACK_ITEM_TYPE_BOX);
        });

        _moveAlbum(findNewBookrackItem.bookrackItems, albumItems, albumSettings);
        await bookrackAccessor.updateBookrackItemOrder(constructionId, newBookrackItems.bookrackItems);

        let _deleteOldContainers = async function(containers, bookrackItemType) {
          for (let item of containers)  {
            if (item.bookrackItemType === bookrackItemType) {
              await bookrackAccessor.deleteBookrackItem(constructionId, item.bookrackItemId);
            }
          }  
        }
        // delete old box, compartment...
        await _deleteOldContainers(compartmentAndBoxes, BOOKRACK_ITEM_TYPE_BOX);
        await _deleteOldContainers(compartmentAndBoxes, BOOKRACK_ITEM_TYPE_COMPARTMENT);

        this.emit('changeBookrackItems');
        return true;
      }
      return false;
    }
  },

  editBoxByPhotoClassification: async function (parent, constructionId, bookrackId){
    // Please catch an exceptions by caller of this function.
   await this.editBoxByTemplate(parent, constructionId, bookrackId, "photoClassification")
    .catch(async (e)=>{
      logger.error('failed to editBoxByTemplate', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'BOXが整頓できません。',
        'OK');
    });
  },

  editBoxByConstructionType: async function (parent, constructionId, bookrackId){
    // Please catch an exceptions by caller of this function.
   await this.editBoxByTemplate(parent, constructionId, bookrackId, "constructionType")
    .catch(async (e)=>{
      logger.error('failed to editBoxByConstructionType', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'BOXが整頓できません。',
        'OK');
      });
  },

  editAlbumDetailSetting: async function (parent, constructionId, albumId) {

    let lockManager = null;
    let locked = false;
    try {
      // lock album
      lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
      locked = await lockManager.lockAlbum(albumId, true);
      if (!locked) {
        await goyoDialog.showAlbumLockBusyDialog(parent);
        return false;
      }  

      let currentDetail = (await bookrackAccessor.getAlbumDetail(constructionId, albumId)).albumDetail;
      let { construction } = await bookrackAccessor.getConstructionDetail(constructionId);
      let photoInfoLabels = null;
      if (construction.knack.knackType === 3) {
        photoInfoLabels = ['工事種目', '施工状況', '詳細', null, null];
      } else if (construction.knack.knackType === 9) {
        photoInfoLabels = construction.photoInformationTags;
      }

      // show album settings
      this._debugLog("pre settings:", currentDetail);
      let newSetting = await goyoDialog.showAlbumSettingDialog(parent, 'INDIVIDUAL', JSON.parse(JSON.stringify(currentDetail)), photoInfoLabels);
      if (!newSetting) { // Do nothing if users clicked 'cancel'.
        return false;
      }
      newSetting.bookCoverOption.frontImagePosition = currentDetail.albumSettings.bookCoverOption.frontImagePosition;
      newSetting.bookCoverOption.reducedImagePosition = currentDetail.albumSettings.bookCoverOption.reducedImagePosition;

      // star icon
      let pit = newSetting.photoInfoTemplate;
      newSetting.bookCoverOption.photoInformationIcon
        = Object.keys(pit).every(key => pit[key] === '') ? 0 : 1;

      //let oldBookCoverColorType = albumDetail.albumSettings.bookCoverOption.bookCoverColorType;
      if (currentDetail.albumSettings.bookCoverOption.bookCoverColorType !== newSetting.bookCoverOption.bookCoverColorType) {
        let ok = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '本当に現在のブックカバーを変更してよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (!ok) {
          newSetting.bookCoverOption.bookCoverColorType
            = currentDetail.albumSettings.bookCoverOption.bookCoverColorType;
        }
      }

      if (newSetting.filePrefix !== undefined) {
        let progressWindow = goyoDialog.showProgressDialog(parent);
        try {
          let prefix = newSetting.filePrefix;
          let num = 1;
          let albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
          let updateFrames = [];
          for (let albumFrame of albumFrames) {
            if (albumFrame.photoFrames.length > 0
               && albumFrame.photoFrames[0].imageFile !== "") {
                // prefix + '000N' + extension
                let suffix = ('000' + num ).slice( -4 );
                let imageFile = albumFrame.photoFrames[0].imageFile;
                let ext = path.extname(imageFile);
                let newName = prefix + suffix + ext;
                albumFrame.photoFrames[0].fileArias = newName;
                num++;
                updateFrames.push(albumFrame);
            }
          }
        } catch(e) {
          throw e;
        } finally {
          await progressWindow.close();
        }
      }

      return newSetting;
    } catch (e) {
      logger.error('failed to editAlbumDetailSetting', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, 'アルバムの設定が変更できません。',
        'OK');
    } finally {
      if (lockManager != null && locked)
        await lockManager.lockAlbum(albumId, false);
    }
    return false;
  },

  _makeReservedPhotoFrame() {
    return {
      imageFile: '', //goyoResources.getAlbumFramePhoto('reserved'),
      fileArias: 'temporalname.TPI',
    }
  },

  editFrameInformationSetting: async function (parent, constructionId, albumId, frameId, key, currentText) {
    // this function is moved into goyo-album-operation.js
  },


  createAlbum: async function(parent, target) {
    // get basic parameters
    let constructionId = target.constructionId;
    let parentBookrackItemId = null;
    let siblingItemId = null;
  },

  createAlbumFromFile : async function(parent, target) {

    let inputFiles = await goyoDialog.showOpenFileSelectionDialog(parent,
        goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, '',
        goyoAppDefaults.inputFileFilter, true);

    if (inputFiles === undefined) {
      logger.debug('cancel reateAlbumFromFile');
      return;
    }

    // MAX 253
    if (inputFiles.length >= goyoAppDefaults.MAX_ADD_PHOTO_FILES) {
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE,
        goyoAppDefaults.MAX_ADD_PHOTO_FILES + '枚以上の選択はできません。',
        'OK');
      return;
    }

    await this._createAlbumFromFileList(parent, target, inputFiles);
  },

  createAlbumFromFolder : async function(parent, target) {

    let folder = await goyoDialog.showFolderSelectionDialog(parent,
        goyoAppDefaults.DIALOG_INPUT_FILE_TITLE, '',
        {}, false);

    if (folder === undefined) {
      logger.debug('cancel createAlbumFromFolder');
      return;
    }
    this._debugLog('folder', folder);

    /* TODO
     * This process requires restrictions
     * It is not possible to search all folders directly under the drive recursively
     * ex)
     * Process recursively up to the folder of one hierarchy
     * It can not select a folder directly under the drive
     */
    let nest = folder[0].split("\\");
    if ((folder[0].split("\\")).length === HDD_ROOT_NUM && nest[1] === '') {
      await goyoDialog.showWarningMessageDialog(parent,
        goyoAppDefaults.DIALOG_TITLE,  `ドライブ直下は選択できません。\n選択したフォルダ(${folder[0]})`, "OK");
      return;
    }

    let inputFiles = [];
    try {
      inputFiles = await directoryWalk(folder[0], goyoAppDefaults.SUPPORT_IMAGE_EXTENSIONS, goyoAppDefaults.MAX_RECURSIVE_DIRS);
      logger.debug(`folder: ${folder}`);
      if (inputFiles.length === 0) {
        return;
      }
    } catch(e) {
      logger.error('failed to collectImageFiles', e);
      await goyoDialog.showWarningMessageDialog(parent,
        goyoAppDefaults.DIALOG_TITLE,  `フォルダの読み込みに失敗しました。\n選択したフォルダ(${folder[0]})`, "OK");
      return;
    }
    let albumName = path.basename(folder[0]);
    this._debugLog('input files', inputFiles);
    this._debugLog('albumName', albumName);

    await this._createAlbumFromFileList(parent, target, inputFiles, albumName);
  },

  _createAlbumFromFileList :async function(parent, target, inputFiles, albumName = '') {
    assert(inputFiles.constructor === Array);
    // get basic parameters
    let constructionId = target.constructionId;
    let parentBookrackItemId = target.bookrackId;
  },

  _debugLog(message, obj) {
    logger.debug(message);
    logger.debug(JSON.stringify(obj, null, 2));
  },

  createCompartment : async function (parent, constructionId, boxAlbumIds) {
    // This function assumes that the following conditions have been satisfied.
    //  * All target box/album are just under one bookrack.
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let firstId = boxAlbumIds[0];

      let findItem = this.findBookrackItem(result.bookrackItems, firstId);
      let firstItem = findItem.bookrackItem;
      let parentId = findItem.parentBookrackItemId;
      if (!firstItem) return false;

      let settings = {
        bookrackItemFolder: '',
        bookrackItemId: 0,
        bookrackItemName: '',
        bookrackItemType: BOOKRACK_ITEM_TYPE_COMPARTMENT,
        bookrackItems: [],
        colorType: 0,
        displayNumber: firstItem.displayNumber,
        parentBookrackItemId: parentId,
        specialType: 0,
      };
      let newSettings = await goyoDialog.showCompartmentCreateWindow(parent, settings);
      if (!newSettings ) {
        return false;
      }

      let newCompartmentItem = await bookrackAccessor.updateBookrackItem(constructionId, newSettings);

      // TODO: multi box, albums
      // move compartment and album, box
      result = await bookrackAccessor.getBookrackItems(constructionId);
      let compartmentItem = this.findBookrackItem(result.bookrackItems, newCompartmentItem.bookrackItemId);
      compartmentItem.bookrackItem.bookrackItems = [];
      let parentBookrackItems = this.findBookrackItem(result.bookrackItems, parentId);
      for(let id of boxAlbumIds){
        let findItem = this.findBookrackItem(result.bookrackItems, id);
        let bookrackItem = JSON.parse(JSON.stringify(findItem.bookrackItem));
        compartmentItem.bookrackItem.bookrackItems.push(bookrackItem);
        let deleteItemIndex = this._indexOfChildItem(parentBookrackItems.bookrackItem.bookrackItems, bookrackItem);
        if(deleteItemIndex !== -1 && id !== firstId){
          parentBookrackItems.bookrackItem.bookrackItems.splice(deleteItemIndex, 1);
        }
      }
      // display number sort
      compartmentItem.bookrackItem.bookrackItems.sort(function(a,b){
        if(a.displayNumber<b.displayNumber) return -1;
        if(a.displayNumber>b.displayNumber) return 1;
        return 0;
      });

      let isUpdate = this.updateBookrackItems(result.bookrackItems, firstItem, compartmentItem.bookrackItem);
      if(isUpdate){
        await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
        this.emit('changeBookrackItems');
        return true;
      }

    } catch (e) {
      logger.error('failed to createCompartment', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, '仕切りが作成できません。',
        'OK');
    }
    return false;
  },
  createCompartmentFromSetting : async function (traySettings, constructionId, boxAlbumIds) {
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let firstId = boxAlbumIds[0];

      let findItem = this.findBookrackItem(result.bookrackItems, firstId);
      let firstItem = findItem.bookrackItem;
      let parentId = findItem.parentBookrackItemId;
      if (!firstItem) return false;

      let settings = {
        bookrackItemFolder: '',
        bookrackItemId: 0,
        bookrackItemName: traySettings.bookrackItemName,
        bookrackItemType: BOOKRACK_ITEM_TYPE_COMPARTMENT,
        bookrackItems: [],
        colorType: 0,
        displayNumber: firstItem.displayNumber,
        parentBookrackItemId: parentId,
        specialType: 0,
      };

      let newCompartmentItem = await bookrackAccessor.updateBookrackItem(constructionId, settings);

      // TODO: multi box, albums
      // move compartment and album, box
      result = await bookrackAccessor.getBookrackItems(constructionId);
      let compartmentItem = this.findBookrackItem(result.bookrackItems, newCompartmentItem.bookrackItemId);
      compartmentItem.bookrackItem.bookrackItems = [];
      let parentBookrackItems = this.findBookrackItem(result.bookrackItems, parentId);
      for(let id of boxAlbumIds){
        let findItem = this.findBookrackItem(result.bookrackItems, id);
        let bookrackItem = JSON.parse(JSON.stringify(findItem.bookrackItem));
        compartmentItem.bookrackItem.bookrackItems.push(bookrackItem);
        let deleteItemIndex = this._indexOfChildItem(parentBookrackItems.bookrackItem.bookrackItems, bookrackItem);
        if(deleteItemIndex !== -1 && id !== firstId){
          parentBookrackItems.bookrackItem.bookrackItems.splice(deleteItemIndex, 1);
        }
      }
      let isUpdate = this.updateBookrackItems(result.bookrackItems, firstItem, compartmentItem.bookrackItem);
      if(isUpdate){
        await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
        this.emit('changeBookrackItems');
        return true;
      }

    } catch (e) {
      logger.error('failed to createCompartment', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, '仕切りが作成できません。',
        'OK');
    }
    return false;
  },

  editCompartment : async function(parent, constructionId, compartmentId) {
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let compartmentItem = this.findBookrackItem(result.bookrackItems, compartmentId);
      if (!compartmentItem.bookrackItem) return false;

      let newSettings = await goyoDialog.showCompartmentCreateWindow(parent, compartmentItem.bookrackItem);
      if (!newSettings ) {
        return false;
      }
      newSettings.bookrackItems = [];

      let updateResult = await bookrackAccessor.updateBookrackItem(constructionId, newSettings);
      if (updateResult.bookrackItemId == undefined) {
        logger.info('error when update compartment');
        return false;
      }

      this.emit('changeBookrackItems');
      return true;

    } catch (e) {
      logger.error('editCompartment', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, '仕切りが編集できません。',
        'OK');
    }
    return false;
  },

  deleteCompartment : async function(parent, constructionId, compartmentId) {
    try {
      let result = await bookrackAccessor.getBookrackItems(constructionId);
      let compartmentItem = this.findBookrackItem(result.bookrackItems, compartmentId);
      if (!compartmentItem.bookrackItem) return false;

      let isDelete = await goyoDialog.showSimpleBinaryQuestionDialog(
        parent,
        "確認",
        '仕切り「' + compartmentItem.bookrackItem.bookrackItemName + '」を削除します。\nよろしいですか？',
        "はい(&Y)", "いいえ(&N)", false);
      // Do nothing if users clicked 'いいえ(N)'.
      if (isDelete) {
        if('bookrackItems' in compartmentItem.bookrackItem) {
          let childItems = compartmentItem.bookrackItem.bookrackItems;
          let isUpdate = this.updateBookrackItems(result.bookrackItems, compartmentItem.bookrackItem, childItems);
          if(isUpdate){
            await bookrackAccessor.updateBookrackItemOrder(constructionId, result.bookrackItems);
          }
        }
        let deleteResult = await this.deleteEmptyContainer(constructionId, compartmentId);
        return deleteResult;
      }

    } catch (e) {
      logger.error('deleteCompartment', e);
      await goyoDialog.showErrorMessageDialog(
        parent,
        goyoAppDefaults.DIALOG_TITLE, '仕切りが削除できません。',
        'OK');
    }
    return false;
  },

  deleteEmptyContainer: async function(constructionId, compartmentId, reloadFlag = true) {
    let updateResult = await bookrackAccessor.deleteBookrackItem(constructionId, compartmentId);
    if (updateResult.bookrackItemId == undefined) {
      logger.info('bookrack-accessor returns invalid response when deleteing compartment or box.');
      return false;
    } else {
      if (reloadFlag) {
        this.emit('changeBookrackItems');
      }
      return true;
    }
  },

}

Object.setPrototypeOf(settingsOperation, EventEmitter.prototype);
module.exports = settingsOperation;

