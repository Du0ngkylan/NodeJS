'use strict';

// Node.js modules.
const path = require('path');
const EventEmitter = require('events');
const assert = require('assert');
var fs = require('fs');
const dateformat = require('dateformat');

// 3rd party modules
var fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppFolder = require('./goyo-appfolder');
const logger = require('./goyo-log')('goyo-construction-operation');
const photoInformationTree = require("./photo-information-tree/photo-information-tree");
const licenseManager = require('./license/goyo-license-manager');

var constructionOperation = {

  // This object is shared with construction information setting windows.
  information: {
    type: null,
    sortout: null,
    folder: null,
    largeClassificationValue: null,
    pattern: null,
    photoInformationTree: "",
    constructions: new Map(),

    set knackType(t) {
      this.type = t;
    },

    get construction() {
      assert(1 <= this.type && this.type <= 9);
      if (!this.constructions.has(this.type)) {
        let newInfo = makeDefaultConstructionInformation(this.type);
        this.constructions.set(this.type, newInfo);
      }
      return this.constructions.get(this.type);
    },

    set construction(info) {
      assert(1 <= this.type && this.type <= 9);
      this.constructions.set(this.type, info);
    },

    set targetFolder(folderPath) {
      this.targetFolder = folderPath;
    },

    set soroutInfomation(info) {
      this.sortoutInfo = info;
    },

    clear() {
      this.type = 0;
      this.sortout = null;
      this.folder = null;
      this.constructions.clear();
    },

    makeDefaultConstructionInformation(){
      let newInfo = makeDefaultConstructionInformation(this.type);
      this.constructions.set(this.type, newInfo);
    },
  },

  create: async function(parent) {
    // !CAUTION!: this function may throw exceptions and don't catch them. please catch them by caller.

    let dialogResult = await goyoDialog.showConstructionSelectionDialog(parent);
    if (dialogResult === false) {
      return null;
    }

    this._preUpdate(0);
    if (this.information.type===9) {
      this.information.construction.photoInformationTags = [
        "工事種目",
        "施工内容１",
        "施工内容２",
        "施工内容３",
        "施工内容４",
        "メモ１",
        "メモ２",
      ];
    }
    logger.debug('create:');
    logger.debug(JSON.stringify(this.information.construction, null, 2));
    let updateResult = await bookrackAccessor.updateConstruction(this.information.construction);
    this.information.construction.constructionId = updateResult.constructionId;
    let information = await bookrackAccessor.getConstructionDetail(updateResult.constructionId);
    this.information.construction.displayNumber = information.construction.displayNumber;
    logger.debug(`displayNumber=${information.construction.displayNumber}`);
    
    let { constructionSettings } = await bookrackAccessor.getConstructionSettings(this.information.construction.constructionId);
    if (this.information.largeClassificationValue) {
      constructionSettings.constructionPhoto.largeClassificationValue = this.information.largeClassificationValue;
    }
    constructionSettings.constructionPhoto.photoTreePattern = this.information.pattern;
    await bookrackAccessor.updateConstructionSettings(this.information.construction.constructionId, constructionSettings);

    photoInformationTree.updateCurrentTree(JSON.parse(this.information.photoInformationTree));
    await photoInformationTree.commitAlbumInfo(updateResult.constructionId);

    await this.updateSharedConstructionSettings(this.information.construction);
    
    return updateResult.constructionId;
  },

  _preUpdate(constructionId) {
    let construction = this.information.construction;
    construction.constructionId = constructionId;

    let appDataFolder = goyoAppFolder.getAppDataFolder();
    if (construction.dataFolder.indexOf(appDataFolder) !== -1) {
      construction.isExternalFolder = false;
      construction.isSharedFolder = false;
    } else {
      construction.isExternalFolder = true;
      construction.isSharedFolder = true;
    }

  },

  updateSharedConstructionSettings: async function(construction) {
    if (licenseManager.licenseType === 'professional' && construction.isSharedFolder) {
      logger.debug(bookrackAccessor.hostName);
      await bookrackAccessor.execSharedConstruction(construction.constructionId, construction.isSharedFolder);  
    } else {
      construction.isSharedFolder = false;
      await bookrackAccessor.updateConstruction(construction);

      let netProfile = path.join(construction.dataFolder, 'NetProf.dat');
      logger.debug(`delete=${netProfile}`);
      if (fse.existsSync(netProfile)) {
        fs.unlinkSync(netProfile);
      }
    }
  },

  getNewConstructionFolder : function(parentFolder) {
    return bookrackAccessor.getNewConstructionFolder(parentFolder);
  },

  checkExistConstructionFolder : async function (folder) {
    let folderSet = await bookrackAccessor.getConstructionFolderPathSet();
    return folderSet.has(folder);
  },

  copy: async function(parent, param) {
    let result = await goyoDialog.showConstructionCopyDialog(parent, param);
    if (result) {
      let srcConstructionId = param.constructionId;
      let displayNumber = param.displayNumber + 1;
      let appDataFolder = goyoAppFolder.getAppDataFolder();
      let isExternalFolder = false;
      let isSharedFolder = false;
      if (result.indexOf(appDataFolder) === -1) {
        isExternalFolder = true;
        isSharedFolder = true;
      }
      let response = 
        await bookrackAccessor.copyConstruction(param.constructionId, displayNumber, 
                                                result, isExternalFolder, isSharedFolder);
      let newConstructionId = response.constructionId;

      let constructions = (await bookrackAccessor.getConstructions()).constructions;

      let newConstructions = [];
      let i = 1;
      let construction = null;
      for (var idx in constructions) {
        if (displayNumber <= i) {
          let c = constructions[idx];

          if (c.constructionId === newConstructionId) {
            construction = 
              (await bookrackAccessor.getConstructionDetail(newConstructionId)).construction;
            newConstructions.push({
              "constructionId" : c.constructionId,
              "displayNumber" : displayNumber,
            });
            construction.displayNumber = displayNumber;
          } else {
            newConstructions.push({
              "constructionId" : c.constructionId,
              "displayNumber" : i + 1,
            });  
          }
        }
        i++;
      }
      await bookrackAccessor.updateConstructionOrder(newConstructions);

      if (construction != null) {
        await this.updateSharedConstructionSettings(construction);
      }
      return response;
    } else {
      return null;
    }
  },


  edit: async function(parent, constructionId) {
    // !CAUTION!: this function may throw exceptions and don't catch them. please catch them by caller.

    // load current construction information
    let info = (await bookrackAccessor.getConstructionDetail(constructionId)).construction;
    info.year = info.year+"";
    while (info.year.length < 4) info.year = "0" + info.year;
    this.information.knackType = info.knack.knackType;
    this.information.construction = info;

    logger.debug('pre edit:');
    logger.debug(JSON.stringify(this.information.construction, null, 2));
    // show construction information window and wait until the window is closed.
    let dialogResult = await goyoDialog.showConstructionInformationDialog(parent, 'edit', info.knack.knackType);
    if (!dialogResult) {
      return null;
    }

    // update construction
    this._preUpdate(constructionId);
    logger.debug('edit:');
    logger.debug(JSON.stringify(this.information.construction, null, 2));
    let updateCtr = await bookrackAccessor.updateConstruction(this.information.construction);
    if(!updateCtr.constructionId) {
      logger.error('fail updateConstruction');
    }
    this.emit('update-construction', updateCtr.constructionId);
  },

  delete: async function(parent, construction){
    let title = 'データの削除';
    if(construction.isExternalFolder){
      let result = await  goyoDialog.showWarningMessageDialog(parent, 
          title,
          `データフォルダのリンクを解除します。\n(データはエクスプローラーなどで削除してください)\n削除してもよろしいですか?`,
          'はい(&Y)',
          'いいえ(&N)',
      );
      if (result === true) {
        // unlink folder
        await bookrackAccessor.deleteConstruction(construction.constructionId, false);
        await this.refreshDisplayNumbers();
        return true;
      }
    } else{
        if (construction != undefined) {

          let albumsCount = 0;
          let dataSize = 0;
          if (fs.existsSync(construction.dataFolder)) {
            const bookrackItems =
              await bookrackAccessor.getBookrackItems(construction.constructionId);
            const constructionInformation = 
              await bookrackAccessor.getConstructionDetail(construction.constructionId, true);
              albumsCount = getAlbumsCount(bookrackItems.bookrackItems);
              dataSize = convertSize(constructionInformation.construction.dataFolderSize);
          }
          let message = `選択した工事を削除します。`
          let information = `${construction.constructionName}（${albumsCount}冊, ${dataSize})`;

          let result = await goyoDialog.showDeleteConfirmDialog(parent, {
              title: title,
              message: message,
              information: information,
              question: '削除を実行しますか？',
              type: 1,
              hasCancel: true,
              okTitle: '削除'
          });
          if (result === true) {
            result = await goyoDialog.showWarningMessageDialog(
              parent, title,
              '本当に工事のデータを全て削除してよろしいですか？',
              'はい(&Y)', 'いいえ(&N)');
            if (result === true) {

              let progressWindow = goyoDialog.showProgressDialog(parent);
              let progress = (e,d,t,w) => {
                progressWindow.setProgress(d / t);
              };
              try {
                await bookrackAccessor.deleteConstruction(
                  construction.constructionId, true, progress);
                  await this.refreshDisplayNumbers();    
              } finally {
                await progressWindow.close();
              }
              return true;
            }
          }
        }
      }
      return false;
    },

    refreshDisplayNumbers : async function() {
      let constructions = (await bookrackAccessor.getConstructions()).constructions;
      if (constructions.length === 0) {
        return;
      }
      let newConstructions = [];
      let i = 1;
      for (var idx in  constructions) {
        let c = constructions[idx];
        newConstructions.push({
          "constructionId" : c.constructionId,
          "displayNumber" : i,
        });
        i++
      }
      await bookrackAccessor.updateConstructionOrder(newConstructions);
    },

    movePosition: async function(constructions){
      await bookrackAccessor.updateConstructionOrder(constructions);
      return true;
    },

    reOrderBookrackFromPreview: async function(constructionId){
      let bookrackItems = (await bookrackAccessor.getBookrackItems(constructionId)).bookrackItems;
      let newBookrackItems = [];
      for (let i = 2; i < bookrackItems.length; i++) {
        newBookrackItems.push(bookrackItems[i]);
      }
      newBookrackItems.push(bookrackItems[1]);
      await bookrackAccessor.deleteBookrackItem(constructionId, bookrackItems[0].bookrackItemId);
      await bookrackAccessor.updateBookrackItemOrder(constructionId, newBookrackItems);
      return true;
    },
};

function getAlbumsCount(bookrackItems) {
  let count = 0;
  bookrackItems.forEach(bookrackItem => {
    if (bookrackItem.bookrackItemType === 3) {
      count++;
    }
    if (bookrackItem.bookrackItems != undefined && Array.isArray(bookrackItem.bookrackItems)) {
      count += getAlbumsCount(bookrackItem.bookrackItems);
    }
  });
  return count;
}


function makeDefaultConstructionInformation(type) {
  // TODO: this is the temporal implementation.
  let dt = new Date();
  return {
    "constructionName": "",
    "constructionNumber": "",
    "contractee": {
      "contracteeCode": "",
      "contracteeId": 0,
      "contracteeName": "",
      "smallCategory":"",
      "middleCategory":"",
      "largeCategory":""
    },
    "contractor": {
      "contractorCode": "",
      "contractorId": 0,
      "contractorName": ""
    },
    "dataFolder": "",
    "displayNumber": 2,
    "isExternalFolder": false,
    "isSharedFolder": false,
    "cloudStrage" : 0,
    "knack": {
      "knackId": 561,
      "knackName": "",
      "knackType": type
    },
    "startDate": dateformat(dt, 'yyyy/mm/dd'),
    "endDate": dateformat(dt, 'yyyy/mm/dd'),
    "waterRouteInformations": [],
    "year": dt.getFullYear(),
    "addresses": [],
    "constructionMethodForms": [],
    "reserve":"",
    "facilityName":"",
    "sourthLatitude":"",
    "northLatitude":"",
    "westLongitude":"",
    "eastLongitude":"",
    "geodetic":"02",
    "constructionContents": "",
    "constructionIndustry": "",
    "constructionField": "",
    "inputJP": "",
    "constructionSystemNumber": "",
    "knackselectlabel":"",
    "major":""
  };
}


function convertSize(size) {
  let type = 0;
  while (size > 1024) {
    size /= 1024;
    type++;
    if (type == 4) {
      break;
    }
  }
  size = round(size, 2);
  switch (type) {
    case 0:
      return size + 'bytes';
    case 1:
      return size + 'KB';
    case 2:
      return size + 'MB';
    case 3:
      return size + 'GB';
    case 4:
      return size + 'GB';
  }
}
function round(num, decimal) {
  return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
}

Object.setPrototypeOf(constructionOperation, EventEmitter.prototype);
module.exports = constructionOperation;
