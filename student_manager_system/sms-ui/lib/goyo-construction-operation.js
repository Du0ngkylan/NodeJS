'use strict';

// Node.js modules.
const assert = require('assert');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const goyoDialog = require('./goyo-dialog-utils');


module.exports = {

  // This object is shared with construction information setting windows.
  information: {
    type: null,
    sortout: null,
    folder: null,
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
  },

  create: async function(parent) {
    // !CAUTION!: this function may throw exceptions and don't catch them. please catch them by caller.

    let dialogResult = await goyoDialog.showConstructionSelectionDialog(parent);
    if (!dialogResult) {
    }

    console.log(this.information.construction);
    // create construction.
    // TODO
    // let updateResult = await bookrackAccessor.createConstruction(constructionId, this.information.construction);
    // if (updateResult) {
    // }
  },

  copy: async function(parent, param) {
    let result = await goyoDialog.showConstructionCopyDialog(parent, param);
    if (!result) {
      return null;
    }
  },


  edit: async function(parent, constructionId) {
    // !CAUTION!: this function may throw exceptions and don't catch them. please catch them by caller.

    // load current construction information
    let info = (await bookrackAccessor.getConstructions(constructionId)).constructions[0];

    this.information.knackType = info.knack.knackType;
    this.information.construction = info;

    // show construction information window and wait until the window is closed.
    let dialogResult = await goyoDialog.showConstructionInformationDialog(parent, 'edit', info.knack.knackType);
    if (!dialogResult) {
      return null;
    }

    console.log(this.information.construction);
    // update construction information if it was changed.
    // TODO
    // let updateResult = await bookrackAccessor.updateConstruction(constructionId, this.information.construction);
    // if (updateResult) {
    // }
  },

};


function makeDefaultConstructionInformation(type) {
  // TODO: this is the temporal implementation.
  return {
    "constructionName": "",
    "constructionNumber": "",
    "contractee": {
      "contracteeCode": "",
      "contracteeId": 0,
      "contracteeName": ""
    },
    "contractor": {
      "contractorCode": "",
      "contractorId": 0,
      "contractorName": ""
    },
    "dataFolder": "",
    "displayNumber": 2,
    "isExternalFolder": false,
    "knack": {
      "knackId": 81,
      "knackName": "農水省 工事 H23.3",
      "knackType": type
    },
    "startDate": "2018/01/01",
    "endDate": "2018/01/01",
    "waterRouteInformations": [],
    "year": 0,
    "addresses": [],
    "constructionMethodForms": [],
  };
}


