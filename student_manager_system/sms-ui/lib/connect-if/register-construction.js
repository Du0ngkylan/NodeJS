'use strict';

const fse = require('fs-extra');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('register-bookrack-item');


const constructionTemplate = {
  "constructionId" : 0,
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
  "displayNumber": 0,
  "isExternalFolder": false,
  "isSharedFolder": false,
  "cloudStrage" : 0,
  "startDate": "",
  "endDate": "",
  "waterRouteInformations": [],
  "year": 0,
  "addresses": [],
  "constructionMethodForms": [],
  "reserve":"",
  "facilityName":"",
  "sourthLatitude":"",
  "northLatitude":"",
  "westLongitude":"",
  "eastLongitude":"",
  "geodetic":"",
  "constructionContents": "",
  "constructionIndustry": "",
  "constructionField": "",
  "inputJP": "",
  "constructionSystemNumber": "",
  "knackselectlabel":""
};

const accessor = {
  registerContruction: async function (jsonData) {
    try {
      var output = {};
      let data = await fse.readFile(jsonData);
      let constructionData = JSON.parse(data);
      let checkValidation = await this.checkValidation(constructionData);
      if (!checkValidation) {
        output = {
          "bookrackItemId": 0,
          "error": 5
        };
        return output;
      }
      let constuctionUpdate = await this.CreateConStruction(constructionData);
      try {
        let response = await bookrackAccessor.updateConstruction(constuctionUpdate);
        let constructionId = response.constructionId;
        let { constructionSettings } = await bookrackAccessor.getConstructionSettings(constructionId);
        if (constuctionUpdate.knack.knackId === 76) {
          constructionSettings.constructionPhoto.photoTreePattern = 3;
          constructionSettings.constructionPhoto.largeClassificationValue = "";
        } else {
          constructionSettings.constructionPhoto.photoTreePattern = 0;
          constructionSettings.constructionPhoto.largeClassificationValue = "工事";
        }
        await bookrackAccessor.updateConstructionSettings(constructionId, constructionSettings);
        output = {
          "constructionId": response.constructionId
        };
      } catch (error) {
        output = {
          "constructionId": 0,
          "error": 2,
          "errorMessage" : error.message,
        };
        logger.error("Faild to updateConstruction", error);
      }
      return output;
    } catch (ex) {
      logger.error('Failed to RegisterContruction', ex);
      throw ex;
    }
  },

  CreateConStruction: async function (constructionData) {
    constructionData = Object.assign(constructionTemplate, constructionData);
    // mandatory id property set
    constructionData.contractee.contracteeId = 0;
    constructionData.contractor.contractorId = 0;

    if (constructionData.knack == "BUILDING") {
      let knackData = {
        "knackId": 76,
        "knackName": "一般建築",
        "knackType": 9
      };
      constructionData.knack = knackData;
      constructionData.photoInformationTags = [
        "工事種目",
        "施工内容１",
        "施工内容２",
        "施工内容３",
        "施工内容４",
        "メモ１",
        "メモ２",
      ];
    } else if (constructionData.knack == "CIVIL" || constructionData.knack !== "BUILDING") {
      let knackData = {
        "knackId": 9,
        "knackName": "一般土木",
        "knackType": 8
      };
      constructionData.knack = knackData;
    }
    // create dataFolder
    const GOYO19_APP_DATA_FOLDER = await require('../goyo-appfolder').asyncGetAppDataFolder();
    constructionData.dataFolder = await bookrackAccessor.getNewConstructionFolder(GOYO19_APP_DATA_FOLDER);
    return constructionData;
  },

  GetToday: async function () {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
      dd = '0' + dd
    }
    if (mm < 10) {
      mm = '0' + mm
    }
    today = yyyy + '/' + mm + '/' + dd;
    return today
  },

  checkValidation: async function (constructionData) {
    let errList = [];
    let isYear = /^\d+$/.test(constructionData.year);
    if (!isYear) {
      errList.push('format year fail');
    }
    if (constructionData.constructionNumber.jlength() > 127) {
      errList.push('constructionNumber max 127 characters');
    }
    if (constructionData.constructionName.jlength() > 254) {
      errList.push('constructionName only Full-width max 127 characters Single-width max 254 characters');
    }
    if (constructionData.constructionName === "") {
      errList.push('constructionName is empty');
    }
    if (!constructionData.startDate) {
      constructionData.startDate = this.GetToday();
    }
    if (!constructionData.endDate) {
      constructionData.endDate = this.GetToday();
    }
    let checkDate = Date.parse(constructionData.endDate) >= Date.parse(constructionData.startDate);
    if (!checkDate) {
      errList.push('endDate must be after startDate.');
    }
    if (constructionData.contractee.contracteeCode.length > 8
      || (constructionData.contractee.contracteeCode.length > 0 && constructionData.contractee.contracteeCode.match(/^[0-9a-zA-Z]+$/) == null)) {
      errList.push('contracteeCode max 8 single-byte alphanumeric characters');
    }
    if (constructionData.contractee.contracteeName.jlength() > 254) {
      errList.push('contracteeName  only Full-width max 127 characters Single-width max 254 characters');
    }
    if (constructionData.contractor.contractorCode.length > 127
      || (constructionData.contractor.contractorCode.length > 0 && constructionData.contractor.contractorCode.match(/^[0-9a-zA-Z]+$/) == null)) {
            errList.push('contractorCode max 127 single-byte alphanumeric characters');
    }
    if (constructionData.contractor.contractorName.jlength() > 254) {
      errList.push('contractorName  only Full-width max 127 characters Single-width max 254 characters');
    }
    if (constructionData.contractee.largeCategory.jlength() > 32) {
      errList.push('largeCategory max 16 characters');
    }
    if (constructionData.contractee.middleCategory.jlength() > 64) {
      errList.push('middleCategory max 32 characters');
    }
    if (constructionData.contractee.smallCategory.jlength() > 60) {
      errList.push('smallCategory max 30 characters');
    }

    if (errList.length > 0) {
      for (const err of errList) {
        logger.error(err);
      }
      return false;
    }
    return true;
  },
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