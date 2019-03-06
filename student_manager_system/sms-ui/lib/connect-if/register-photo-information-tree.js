'use strict';

const fse = require('fs-extra');
// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('register-bookrack-item');
const commandLock = require('./command-lock');

const accessor = {
  id: 2,
  registerPhotoInforTree: async function (constructionId, jsonData) {
    const io_error = {
      "constructionId": constructionId,
      "error": 2
    };
    let output = {};    
    try {
      await commandLock.lockSharedConstruction(constructionId);
      await commandLock.existSharedLockOwners();
      try {
        let data = await fse.readFile(jsonData);
        let photoInformationTreeNode = JSON.parse(data);
        let checkValidation = await this.checkValidation(constructionId, photoInformationTreeNode);
        if (!checkValidation) {
          output = {
            "constructionId": constructionId,
            "error": 5
          };
          return output;
        }
        let dataResult = JSON.parse(JSON.stringify(photoInformationTreeNode).replace(/children/g, 'photoChildItems'));
        dataResult["itemId"] = 1;

        let { constructionSettings } = await bookrackAccessor.getConstructionSettings(constructionId);
        let treePattern = constructionSettings.constructionPhoto.photoTreePattern;
        if (treePattern < 2) {
          // treePattern 0 or 1 -> child node is large classification
          if (dataResult.hasOwnProperty('photoChildItems')
            && dataResult.photoChildItems.length == 1) {
            let largeClassificationNode = dataResult.photoChildItems[0];
            // exclude large classification node
            dataResult.photoChildItems = largeClassificationNode.photoChildItems;

            if (largeClassificationNode.hasOwnProperty('itemName')
              && largeClassificationNode.itemName !== "") {
                constructionSettings.constructionPhoto.largeClassificationValue = largeClassificationNode.itemName;
                await bookrackAccessor.updateConstructionSettings(constructionId, constructionSettings);
              }
          }
        } //else {  // 2 or 3 or other -> No replacement of nodes

        if (dataResult.hasOwnProperty('photoChildItems')) {
          await this.eachRecursive(dataResult.photoChildItems);
        }
        let response = await bookrackAccessor.updatePhotoInformationItems(constructionId, dataResult);
        if (response.updateCount > 0) {
          output = {
            "constructionId": constructionId,
            "error" : 0
          };
        } else {
          output = io_error;
        }
      } catch (error) {
        logger.error('Failed to updatePhotoInformationItems', error);
        output = io_error;
      }
    } catch (ex) {
      logger.error('Failed to RegisterPhotoInforTree', ex);
      throw ex;
    } finally {
      await commandLock.unLockSharedConstruction();
    }
    return output;
  },

  checkValidation: async function (constructionId, photoInformationTreeNode) {
    let knackId = (await bookrackAccessor.getConstructionDetail(constructionId)).construction.knack.knackId;
    if (photoInformationTreeNode.children.length > 1 && (knackId !== 31 || knackId !== 76)) {
      errList.push('Children Node can not register more than one');
    }
    let errList = [];
    this.checkValidationName(photoInformationTreeNode, errList);
    if (errList.length > 0) {
      for (const err of errList) {
        logger.error(err);
      }
      return false;
    }
    return true;
  },
  checkValidationName: function(photoInformationTreeNode, errList) {
    if (photoInformationTreeNode.itemName.jlength() > 254) {
      errList.push("itemName's Maxlenght is 127 characters");
    }
    if (photoInformationTreeNode.hasOwnProperty('children')
     && Array.isArray(photoInformationTreeNode.children)) {
      let children = photoInformationTreeNode.children;
      for (let c of children) {
        this.checkValidationName(c, errList);
      }
    }
  },
  eachRecursive: async function(obj) {
    for (var k in obj) {
      obj[k]["itemId"] = this.id;
      this.id++;
      if (obj[k].hasOwnProperty('photoChildItems')) {
        await this.eachRecursive(obj[k].photoChildItems);
      }
    }
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

module.exports = accessor;