'use strict';

// Node modules.
const path = require('path');
const fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const common = require('./connect-if-util');
const logger = require('../goyo-log')('register-bookrack-item');
const goyoAlbumLayout = require('../layout/goyo-album-layout');
const commandLock = require('./command-lock');

const GOYO19_APP_FOLDER = require('../goyo-appfolder').getAppFolder();


const accessor = {
  registerBookrackItems: async function(constructionId, jsonData) {
    try {
      await commandLock.lockSharedConstruction(constructionId);
      await commandLock.existSharedLockOwners();
      var output = [];
      let successConnectIdBookrackItemIdList = {};
      let data = await fse.readFile(jsonData);
      let bookrackItems = JSON.parse(data);
      for(let bookrackItem of bookrackItems){
        // connectIdは必須
        if (!("connectId" in bookrackItem)){
          output.push({
            "connectId": "",
            "bookrackItemId": "",
            "error" : 6
          });
          continue;
        } 

        // parentConnectIdを持っている場合、parentBookrackItemIdを上書きする
        if( "parentConnectId" in bookrackItem ){
          if( bookrackItem.parentConnectId in successConnectIdBookrackItemIdList ){
            bookrackItem.parentBookrackItemId = successConnectIdBookrackItemIdList[bookrackItem.parentConnectId];
          }
        }

        let checkValidation = await this.checkValidation(bookrackItem, constructionId);
        if(!checkValidation) {
          output.push({
            "connectId": bookrackItem.connectId,
            "bookrackItemId": "",
            "error" : 5
          });
          continue;
        }

        let resultData = await this.createBookrackNode(bookrackItem, constructionId);
        let bookrackItemType = parseInt(bookrackItem.bookrackItemType);
        if(bookrackItemType !== 3) {
          try {
            let response = await bookrackAccessor.updateBookrackItem(constructionId, resultData);
            if (bookrackItemType === 0) {
              await this.sortBookrackItems(constructionId);
            }
            let bookrackItemId = ""+common.joinIds(constructionId, response.bookrackItemId);
            output.push({
              "connectId": bookrackItem.connectId,
              "bookrackItemId": bookrackItemId
            });
            successConnectIdBookrackItemIdList[bookrackItem.connectId] = bookrackItemId;
          } catch (error) {
            output.push({
              "connectId": bookrackItem.connectId,
              "bookrackItemId": "",
              "error": 2
            });
          }
        } else {
          // ALBUM
          try {
            let response = await bookrackAccessor.updateAlbum(constructionId, resultData.albumInformation);
            let bookrackItemId = ""+common.joinIds(constructionId, response.albumId);
            output.push({
              "connectId": bookrackItem.connectId,
              "bookrackItemId": bookrackItemId
            });
            successConnectIdBookrackItemIdList[bookrackItem.connectId] = bookrackItemId;
          } catch (error) {
            output.push({
              "connectId": bookrackItem.connectId,
              "bookrackItemId": "",
              "error": 2
            });
          }
        }
      }
      return output;
      
    } catch (ex) {
      logger.error('Failed to RegisterBookrackItem', ex);
      throw ex;
    } finally {
      await require('../goyo-temporal').finalize();
      await commandLock.unLockSharedConstruction();
    }
  },

  createBookrackNode: async function(bookrackItem) {
    let mapbookrackItemType = {
      'BOOKRACK': 0,
      'COMPARTMENT': 1,
      'BOX': 2,
      'ALBUM': 3
    };
    if (bookrackItem.bookrackItemName.jlength() > 254) {
      bookrackItem.bookrackItemName = jsubstr(bookrackItem.bookrackItemName, 254);
    }
    let bookrackItemType = bookrackItem.bookrackItemType.toUpperCase();
    if(mapbookrackItemType.hasOwnProperty(bookrackItemType)) {
      bookrackItem.bookrackItemType = mapbookrackItemType[bookrackItemType];
      bookrackItem.parentBookrackItemId = bookrackItem.parentBookrackItemId;
      bookrackItem.bookrackItemId = 0;
      bookrackItem.colorType = 1;
      bookrackItem.specialType = 0;
      if(bookrackItem.bookrackItemType !== 3) {
        return bookrackItem;
      } else {
        let album = {};
        let type = goyoAlbumLayout.LAYOUT_TYPE_STANDARD;
        let templateId = 1;
        if (bookrackItem.albumInformation.hasOwnProperty('albumTemplateType')) {
          type = bookrackItem.albumInformation.albumTemplateType;
        }
        if (bookrackItem.albumInformation.hasOwnProperty('albumTemplateid')) {
          templateId = bookrackItem.albumInformation.albumTemplateid;
        }
        // load program settings
        await require('../goyo-program-settings').initialize();
        const goyoTemporal = require('../goyo-temporal');
        await goyoTemporal.initialize(path.join(GOYO19_APP_FOLDER, 'tempfiles'));
        let albumTemplates = await goyoAlbumLayout.getLayoutInfos(type);
        for (const albumTemplate of albumTemplates) {
          if(albumTemplate.id === templateId) {
            break;
          }
        }
        bookrackItem.albumInformation = album;
        return bookrackItem;
      }
    }
  },

  sortBookrackItems: async function(constructionId) {
    let { bookrackItems } = await bookrackAccessor.getBookrackItems(constructionId);

    let systemBookrack = null;
    let newOrders = [];
    for (let bookrackItem of bookrackItems) {
      if (bookrackItem.bookrackItemType === 0) {
        if (bookrackItem.specialType === 1) {
          systemBookrack = bookrackItem;
        } else {
          newOrders.push(bookrackItem);
        }
      }
    }
    if (systemBookrack != null) {
      newOrders.push(systemBookrack);
    }

    await bookrackAccessor.updateBookrackItemOrder(constructionId, newOrders);
  },

  getAlbumParameters: function(albumSettings, bookrackItem) {
    albumSettings.albumName = bookrackItem.bookrackItemName;
    if (albumSettings.hasOwnProperty("bookCoverOption")) {
      albumSettings.bookCoverOption.frontImagePosition = 1;
      albumSettings.bookCoverOption.reducedImagePosition = 1;
    }
    albumSettings.bookCoverOption.photoInformationIcon = 0;
    if (bookrackItem.albumInformation.hasOwnProperty('organizeInfo')) {
      let props = [
        'constructionType',
        'largeClassification',
        'middleClassification',
        'photoClassification',
        'smallClassification',
      ];
      for (let prop of props) {
        if (bookrackItem.albumInformation.organizeInfo.hasOwnProperty(prop)
        && bookrackItem.albumInformation.organizeInfo[prop]) {
          albumSettings.photoInfoTemplate[prop] = bookrackItem.albumInformation.organizeInfo[prop];
          albumSettings.bookCoverOption.photoInformationIcon = 1;
        }
      }  
    }
    if(bookrackItem.albumInformation.textDisplayType === 'T') {
      albumSettings.sentence.displayType = 0;
    } else {
      albumSettings.sentence.displayType = 1;
    }
    return albumSettings;
  },

  checkValidation: async function(bookrackItem, constructionId) {
    let errList = [];
    // if(bookrackItem.bookrackItemName.jlength() > 254) {
    //   errList.push('max 127 characters');
    // }
    if(!['BOOKRACK', 'COMPARTMENT', 'BOX', 'ALBUM'].includes(bookrackItem.bookrackItemType)) {
      errList.push("No category type in 'BOOKRACK', 'COMPARTMENT', 'BOX', 'ALBUM'");
    }
    let parentBookrackItemId = '0';
    if (bookrackItem.bookrackItemType !== 'BOOKRACK') {
      parentBookrackItemId = common.parseBookrackItemId(bookrackItem.parentBookrackItemId);
      if (parentBookrackItemId == "0") {
        errList.push("ID format error");
      }  
    }
    let { bookrackItems } = await bookrackAccessor.getBookrackItems(constructionId);
    // set the ID of the internal format
    bookrackItem.parentBookrackItemId = parseInt(parentBookrackItemId);
    let parentBookrackItem = this.findBookrackItem(bookrackItem.parentBookrackItemId, bookrackItems);
    if(!parentBookrackItem && bookrackItem.bookrackItemType !== 'BOOKRACK') {
      errList.push("Not exist parent bookrack item");
    }

    //TODO:工事写真情報も切り出すか？
    if(bookrackItem.bookrackItemType === 'ALBUM') {
      if (bookrackItem.hasOwnProperty('albumInformation')) {
        let val = bookrackItem.albumInformation.organizeInfo.largeClassification;
        if (val.jlength() > 254) {
          errList.push("largeClassification only Full-width max 127 characters Single-width max 254 characters");
        }
        val = bookrackItem.albumInformation.organizeInfo.constructionType;
        if (val.jlength() > 254) {
          errList.push("constructionType only Full-width max 127 characters Single-width max 254 characters");
        }
        val = bookrackItem.albumInformation.organizeInfo.middleClassification;
        if (val.jlength() > 254) {
          errList.push("middleClassification only Full-width max 127 characters Single-width max 254 characters");
        }
        val = bookrackItem.albumInformation.organizeInfo.photoClassification;
        if (val.jlength() > 254) {
          errList.push("photoClassification only Full-width max 127 characters Single-width max 254 characters");
        }
        val = bookrackItem.albumInformation.organizeInfo.smallClassification;
        if (val.jlength() > 254) {
          errList.push("smallClassification only Full-width max 127 characters Single-width max 254 characters");
        }  
      } else {
        errList.push("albumInformation not specified");
      }
    }
    if(errList.length > 0) {
      for (const err of errList) {
        logger.error(err);
      }
      return false;
    }
    return true;
  },

  findBookrackItem: function(bookrackItemId, bookrackItems) {
    for (const bookrackItem of bookrackItems) {
      if (bookrackItem.bookrackItemId === bookrackItemId) return true;
      if (bookrackItem.bookrackItems) {
        const result = this.findBookrackItem(bookrackItemId, bookrackItem.bookrackItems);
        if (result) return result;
      }
    }
    return false;
  }
};

String.prototype.jlength = function () {
  var i, count = 0;
  for (i = 0; i < this.length; i++) {
    if (escape(this.charAt(i)).length >= 4) {
      count += 2;
    } else {
      count++;
    }
  }
  return count;
};

function jsubstr(text, len, truncation) {
  if (truncation === undefined) { truncation = ''; }
  var text_array = text.split('');
  var count = 0;
  var str = '';
  for (i = 0; i < text_array.length; i++) {
    var n = escape(text_array[i]);
    if (n.length < 4) count++;
    else count += 2;
    if (count > len) {
      return str + truncation;
    }
    str += text.charAt(i);
  }
  return text;
}

module.exports = accessor;