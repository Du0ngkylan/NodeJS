'use strict';

// Node.js modules.
const assert = require('assert');
const spawn = require('child_process').spawn;
const path = require('path');
const EventEmitter = require('events');
const dateformat = require('dateformat');
const fs = require('fs');

// 3rd-parth modules.
const byline = require('byline');
const uuidv4 = require('uuid/v4');


const SPAWN_OPTION = {};

// Original error class for bookrack-accessor.
function SmsAccessorError(type, message, request) {
  Error.captureStackTrace(this, SmsAccessorError);
  this.type = type;
  this.message = message;
  this.request = request;
}

var accessor = {

  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_COMMAND: 'INVALID_COMMAND',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT',
  IO_ERROR: 'IO_ERROR',
  OTHER_ERROR: 'OTHER_ERROR',
  MAX_CONSTRUCTIONS : 1000000,

  process: null,
  requestQueue: [],
  finalizePromise: null,
  serialNumber: null,
  hostName: null,
  appVersion : null,

  initialize: function(dir, logLevel=3) {
    // third parameter is a workaround for electron' bug.
    this.process = spawn(
        path.join(__dirname, 'accessor.exe'), [dir, __dirname, logLevel], SPAWN_OPTION);
    //Specify the return value as utf8 string.  
    this.process.stdout.setEncoding('utf-8');
    // At receiving data, resolve the promise of corresponding request.
    byline.createStream(this.process.stdout).on('data', chunk => {
      this._receiveResponse(chunk);
    });

    // At program exit, resolve finalize promise.
    this.process.on('exit', (code, signal) => {
      if (!this.finalizePromise || this.requestQueue.length > 0) {
        let message = `accessor.exe exited unexpectedly: code=${code}, signal=${
            signal}, waiting_request=${this.requestQueue.length}`;
        if (this.requestQueue.length > 0) {
          message += `, current_request=${
              JSON.stringify(this.requestQueue[0].request)}`;
        }
        this.emit(
            'abort', new SmsAccessorError(this.INTERNAL_ERROR, message));
      } else {
        let [resolve, reject] = this.finalizePromise;
        this.finalizePromise = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new SmsAccessorError(
              this.INTERNAL_ERROR,
              `accessor.exe exited with error. code=${code}, signal=${signal}`));
        }
      }
    });
  },

  getLogLevel : function(appEnv, name) {
    if (appEnv && appEnv.settings && appEnv.settings.logLevels) {
      let levels = appEnv.settings.logLevels;
      if (levels.hasOwnProperty(name)) {
        let lv = levels[name].level;
        return lv;
      }
    }
    return 3;
  },

  // Send 'end' command to program and return promise.
  finalize: function() {
    return new Promise((resolve, reject) => {
      this.finalizePromise = [resolve, reject];
      this.process.stdin.write('{"command":"exit"}\n');
    });
  },

  setSerialNumber(serialNumber) {
    this.serialNumber = serialNumber;
  },

  setHostName(hostName) {
    this.hostName = hostName;
  },

  setAppVersion(appVersion) {
    this.appVersion = appVersion;
  },

  // Send request command to program and return promise.
  _sendRequest: function(request, callback) {
    if (this.finalizePromise) {
      throw new SmsAccessorError(
        this.OTHER_ERROR, `command request received after finalize.`);
    }

    return new Promise((resolve, reject) => {
      let json = JSON.stringify(request);
      this.requestQueue.push({resolve, reject, callback, request});
      this.process.stdin.write(`${json}\n`, 'utf8');
    });
  },

  // Receive response from program and resolve promise.
  _receiveResponse: function(chunk) {
    assert(
        this.requestQueue.length > 0,
        'sms-accessor.js: request queue management error.');

    if (chunk === '') {
      return;
    }

    try {
      let data = JSON.parse(chunk);
      if (data.hasOwnProperty('progress')) {
        let {resolve, reject, callback, request} = this.requestQueue[0];
        if (callback) {
          callback('progress', data.progress.done,
            data.progress.total, data.progress.working);
        }
      } else if (data.hasOwnProperty('error')) {
        let {resolve, reject, callback, request} = this.requestQueue.shift();
        reject(new SmsAccessorError(data.error.type, data.error.message, request));
      } else if (data.hasOwnProperty('response')) {
        let {resolve, reject, callback, request} = this.requestQueue.shift();
        resolve(data.response);
      } else {
        let bae = new SmsAccessorError(
          this.INTERNAL_ERROR,
          'accessor.exe: returned data without response nor error.')
        this.emit('error', bae);
      }
    } catch (e) {
      let bae = new SmsAccessorError(
        this.INTERNAL_ERROR,
        `accessor.exe: returned invalid JSON format: chunk=${chunk}, error=${e}`)
      this.emit('error', bae);
    }
  },

  //
  // Functions below are test operations.
  //
  testProgress: function(callback) {
    let req = {command: 'test-progress'};
    return this._sendRequest(req, callback);
  },

  //
  // Functions below are sms operations.
  //

  // Construction

  getSchools: function() {
    let req = { command: 'get-schools'};
    return this._sendRequest(req);
  },

  getSchoolDetail: function(constructionId) {
    let req = {
      command: 'get-school-detail',
      args: {'constructionId': constructionId}
    };
    return this._sendRequest(req);
  },

  getKnacks: function() {
    let req = {
      command: 'get-knacks',
    };
    return this._sendRequest(req);
  },

  getPhotoInformationTree: function (constructionId, itemId=1) {
    let req = {
        command: 'get-photo-info-tree',
        args: {
          'constructionId': constructionId,
          'itemId': itemId,
        }
    };
    return this._sendRequest(req);
  },

  updateConstruction: function(construction, callback = undefined) {

    this._fillConstructionPrameters(construction);
    let req = {
      command: 'update-construction',
      args: {
        'construction': construction,
      }
    };
    return this._sendRequest(req, callback);
  },

  _getCreateDate : function() {
    let dt = new Date();
    let formatted = dateformat(dt, 'yyyy-mm-dd');
    return formatted;
  },

  getNewConstructionFolder : async function(parentFolder) {
    let response = await this.getConstructions();
    let nextConstructionId = 1;
    const constructionIdList = response.constructions
      .map(construction => Number(construction.constructionId))
      .filter(id => id != null && !isNaN(id))
    if ( constructionIdList.length > 0 ) {
      const maxConstructionId = Math.max.apply(null, constructionIdList);
      if ( maxConstructionId != null && !isNaN(maxConstructionId) ) {
        nextConstructionId = maxConstructionId + 1;
      }
    }
    const baseFolder = `${parentFolder}\\construction${nextConstructionId}`;

    if (fs.existsSync(baseFolder) == false) {
      return baseFolder;
    }

    let folder = baseFolder;
      for (let i = 1; i <= this.MAX_CONSTRUCTIONS; i++) {
      folder = `${baseFolder}_${i}`;
      if (fs.existsSync(folder) == false) {
          break;
        }
      }
    return folder;
  },

  getConstructionFolderPathSet : async function() {
    // get current folder map
    let folderSet = new Set();
    try {
      let response = await this.getConstructions();
      response.constructions.forEach((construction)=>{
        folderSet.add(construction.dataFolder);
      });
    } catch (e) {
    }
    return folderSet;
  },

  _fillConstructionPrameters : function(construction) {

    if (construction.constructionId == 0) {

      if (construction.createDate === undefined) {
        construction.createDate = this._getCreateDate();
      }

      // set GUID
      if (construction.guId === undefined) {
        construction.guId = uuidv4();
      }
    }

    construction.year = parseInt(construction.year);
    if (construction.routeSection !== undefined) {
      construction.routeSection = parseInt(construction.routeSection);
    }
    if (construction.sourthLatitude !== undefined) {
      construction.sourthLatitude = String(construction.sourthLatitude);
    }
    if (construction.northLatitude !== undefined) {
      construction.northLatitude = String(construction.northLatitude);
    }
    if (construction.westLongitude !== undefined) {
      construction.westLongitude = String(construction.westLongitude);
    }
    if (construction.eastLongitude !== undefined) {
      construction.eastLongitude = String(construction.eastLongitude);
    }
    if (construction.stationStartN !== undefined) {
      construction.stationStartN = String(construction.stationStartN);
    }
    if (construction.stationStartM !== undefined) {
      construction.stationStartM = String(construction.stationStartM);
    }
    if (construction.stationEndN !== undefined) {
      construction.stationEndN = String(construction.stationEndN);
    }
    if (construction.stationEndM !== undefined) {
      construction.stationEndM = String(construction.stationEndM);
    }
    if (construction.distanceStartN !== undefined) {
      construction.distanceStartN = String(construction.distanceStartN);
    }
    if (construction.distanceStartM !== undefined) {
      construction.distanceStartM = String(construction.distanceStartM);
    }
    if (construction.distanceEndN !== undefined) {
      construction.distanceEndN = String(construction.distanceEndN);
    }
    if (construction.distanceEndM !== undefined) {
      construction.distanceEndM = String(construction.distanceEndM);
    }


  },

  copyConstruction: function(
    srcConstructionId, displayNumber, newDataFolder = '',useExternalFolder = false, useSharedFolder = false) {
  let construction = {
    "createDate" : this._getCreateDate(),
    "guId" : uuidv4()
  };
  let req = {
    command: 'copy-construction',
    args: {
      "srcConstructionId": srcConstructionId,
      "displayNumber" : displayNumber,
      "newDataFolder" : newDataFolder,
      "useExternalFolder" : useExternalFolder,
      "useSharedFolder" : useSharedFolder,
      "construction" : construction
    }
  };
  return this._sendRequest(req);
},

  deleteConstruction: function(constructionId, deleteDirectory = true, callback = undefined) {
    let req = {
      command: 'delete-construction',
      args: {
        'constructionId': constructionId,
        'deleteDirectory': deleteDirectory,
      }
    };
    return this._sendRequest(req, callback);
  },

  updateConstructionOrder: function(constructions) {
    let req = {
      command: 'update-construction-order',
      args: {
        'constructions': constructions,
      }
    };
    return this._sendRequest(req);
  },

  updatePhotoInformationItems : function(constructionId, photoInfoItemTree) {
    let req = {
      command: "update-photo-info-items",
      args : {
        "constructionId": constructionId,
        "photoInfoItemTree": photoInfoItemTree
      }
    };
    return this._sendRequest(req);
  },

  getUserContractee: function() {
    let req = {command: 'get-user-contractee'};
    return this._sendRequest(req);
  },

  getUserContractor :function() {
    let req = {
      command: "get-user-contractor"
    };
    return this._sendRequest(req);
  },

  // Master

  getPrefectures: function() {
    let req = {command: 'get-prefectures'};
    return this._sendRequest(req);
  },

  getRegions: function(prefectureId) {
    let req = {
      command: 'get-regions',
      args: {
        'prefectureId': prefectureId,
      }
    };
    return this._sendRequest(req);
  },

  getConstructionFields: function() {
    let req = {
      command: 'get-construction-fields',
    };
    return this._sendRequest(req);
  },

  getConstructionIndustryTypes: function() {
    let req = {
      command: 'get-construction-industry-types',
    };
    return this._sendRequest(req);
  },

  getConstructionTypes: function() {
    let req = {
      command: 'get-construction-types',
    };
    return this._sendRequest(req);
  },

  getConstructionMethodForms: function(constructionTypeId) {
    let req = {
      command: 'get-construction-method-forms',
      args: {
        'constructionTypeId': constructionTypeId,
      }
    };
    return this._sendRequest(req);
  },

  getBusinessFields :function(knackId, departmentCode = "", detailCode = "", stageCode = "") {
    let req = {
      command:'get-business-fields',
      args: {
        'knackId':knackId,
        'departmentCode' : departmentCode, 
        'detailCode' : detailCode,
        'stageCode' : stageCode,
      }
    };
    return this._sendRequest(req);
  },

  getBusinessKeywords: function(knackId, businessKeywordFieldCode = "", businessKeywordLargeCode = "", businessKeywordMiddleCode = "") {
    let req = {
      command:'get-business-keywords',
      args: {
        'knackId':knackId,
        'businessKeywordFieldCode' : businessKeywordFieldCode, 
        'businessKeywordLargeCode' : businessKeywordLargeCode,
        'businessKeywordMiddleCode' : businessKeywordMiddleCode,
      }
    };
    return this._sendRequest(req);
  },

  getWaterRouteInformations :function(waterRouteClassficationCode = "", waterRouteTypeCode = "") {
    let req = {
      command:'get-water-route-infos',
      args: {
        'waterRouteClassficationCode' : waterRouteClassficationCode, 
        'waterRouteTypeCode' : waterRouteTypeCode,
      }
    };
    return this._sendRequest(req);
  },

  getContractee :function(contracteeLargeCode = "", contracteeMiddleCode = "", contracteeSmallCode = "") {
    let req = {
      command:'get-contractee',
      args: {
        'contracteeLargeCode' : contracteeLargeCode,
        'contracteeMiddleCode' : contracteeMiddleCode,
        'contracteeSmallCode' : contracteeSmallCode,
      }
    };
    return this._sendRequest(req);
  },

  getPhotoClassifications: function(knackId) {;
    let req = {
      command:'get-photo-classifications',
      args:{
        'knackId':knackId
      }
    };
    return this._sendRequest(req);
  },

  getGeneralConstructionMaster: function(callback = undefined) {;
    let req = {
      command:'get-general-construction-master'
    };
    return this._sendRequest(req,callback);
  },

  getEizenConstructionMaster: function(callback = undefined) {;
    let req = {
      command:'get-eizen-construction-master'
    };
    return this._sendRequest(req,callback);
  },

  getConstructionMaster: function(constructionCode, callback = undefined) {;
    let req = {
      command:'get-construction-master',
      args:{
        'constructionCode':constructionCode
      }
    };
    return this._sendRequest(req,callback);
  },

  getConstructionTypeMaster :function(knackId, knackType, callback = undefined) {
    let req = {
      command:'get-construction-type-master',
      args: {
        'knackId':knackId,
        'knackType':knackType,
      }
    };
    return this._sendRequest(req, callback);
  },

  // Image

  createThumbnail: function(
    sourceFile, destFile, width, height, quality) {
    let req = {
      command: 'create-thumbnail',
      args: {
        'sourceFile': sourceFile,
        'destFile': destFile,
        'width': width,
        'height': height,        
        'quality': quality
      }
    };
    return this._sendRequest(req);
  },

  getImageInfo: function(sourceFile) {
    let req = {
      command: 'get-image-info',
      args: {
        'sourceFile': sourceFile
      }
    };
    return this._sendRequest(req);
  },

  convertJpg: function(sourceFile, destFile) {
    let req = {
      command: 'convert-jpg',
      args: {
        'sourceFile': sourceFile,
        'destFile': destFile
      }
    };
    return this._sendRequest(req);
  },

  resizeImage: function(
    sourceFile, destFile, width, height, ratio) {
    let req = {
      command: 'resize-image',
      args: {
        'sourceFile': sourceFile,
        'destFile': destFile,
        'width': width,
        'height': height,
        'ratio': ratio,
      }
    };
    return this._sendRequest(req);
  },

  // Bookrack

  getBookracks: function(constructionId) {
    let req = {
      command: 'get-bookracks',
      args: {
        'constructionId': constructionId,
      }
    };
    return this._sendRequest(req);
  },

  getBookrackItems: function(constructionId) {
    let req = {
      command: 'get-bookrack-items',
      args: {
        'constructionId': constructionId,
      }
    };
    return this._sendRequest(req);
  },

  updateBookrackItem: function(constructionId, bookrackItem) {
    let req = {
      command: 'update-bookrack-item',
      args: {
        'constructionId': constructionId,
        'bookrackItem' : bookrackItem,
      }
    };
    return this._sendRequest(req);
  },

  deleteBookrackItem: function(constructionId, bookrackItemId) {
    let req = {
      command: 'delete-bookrack-item',
      args: {
        'constructionId': constructionId,
        'bookrackItemId' : bookrackItemId,
      }
    };
    return this._sendRequest(req);
  },

  updateBookrackItemOrder: function(constructionId, bookrackItems) {
    let req = {
      command: 'update-bookrack-item-order',
      args: {
        'constructionId': constructionId,
        'bookrackItems' : bookrackItems,
      }
    };
    return this._sendRequest(req);
  },

  async getBookrackById(bookrackItem, bookrackId){
    for(let i = 0; i < bookrackItem.length; i++){
      if(bookrackItem[i].bookrackItemId == bookrackId){
        return bookrackItem[i];
      }
    }
    return bookrackItem[0];
  },

  findBookrackItem: function(bookrackItemId, bookrackItems) {
    for (let i = 0; i < bookrackItems.length; i++) {
      if (bookrackItems[i].bookrackItemId === bookrackItemId) return bookrackItems[i];
      if (bookrackItems[i].bookrackItems) {
        const result = this.findBookrackItem(bookrackItemId, bookrackItems[i].bookrackItems);
        if (result) return result;
      };
    }
    return null;
  },

  // Album

  getAlbumDetail: function (constructionId, albumId) {
    let req = {
      command: 'get-album-detail',
      args: {
        'constructionId': constructionId,
        'albumId': albumId
      }
    };
    return this._sendRequest(req);
  },
 
  getAlbumFrames: function (constructionId, albumId, fetchFramePosition = 0, fetchCount = -1) {
    let req = {
      command: 'get-album-frames',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
        "fetchFramePosition": fetchFramePosition,
        "fetchCount": fetchCount
      }
    };
    return this._sendRequest(req);
  },

  getAlbumFrameIds: function (constructionId, albumId) {
    let req = {
      command: 'get-album-frame-ids',
      args: {
        'constructionId': constructionId,
        'albumId': albumId
      }
    };
    return this._sendRequest(req);
  },

  getBookmarks: function (constructionId, albumId) {
    let req = {
      command: 'get-bookmarks',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
      }
    };
    return this._sendRequest(req);
  },

  updateBookmark(constructionId, albumId, bookmark) {
    let req = {
      command: "update-bookmark",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "bookmark": bookmark,
      }
    };
    return this._sendRequest(req);
  },

  deleteBookmark(constructionId, albumId, bookmarkId) {
    let req = {
      command: "delete-bookmark",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "bookmarkId": bookmarkId,
      }
    };
    return this._sendRequest(req);
  },

  updateAlbum: function (constructionId, album) {
    let req = {
      command: "update-album",
      args: {
        "constructionId": constructionId,
        "album": album,
      }
    };
    return this._sendRequest(req);
  },

  deleteAlbum(constructionId, albumId, immediately = false, callback=()=>{}) {
    let req = {
      command: "delete-album",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "immediately" : immediately,
      }
    };
    return this._sendRequest(req, callback);
  },

  updateAlbumFrames: function (constructionId, albumId, albumFrames, callback=()=>{}) {
    let req = {
      command: 'update-album-frames',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
        'albumFrames': albumFrames
      }
    };
    return this._sendRequest(req, callback);
  },

  updateAlbumFrameOrder: function(constructionId, albumId, albumFrameIds, sortStartPosition = 0) {
    let req = {
      command: "update-album-frame-order",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "albumFrameIds": albumFrameIds,
        "sortStartPosition": sortStartPosition,
      }
    };
    return this._sendRequest(req);
  },

  deleteAlbumFrame: function(constructionId, albumId, albumFrameId, immediately = false) {
    let req = {
      command: "delete-album-frame",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "albumFrameId": albumFrameId,
        "immediately" : immediately,
      }
    };
    return this._sendRequest(req);
  },

  addAlbumFrames: function(constructionId, albumId, albumFrames, callback=()=>{}) {
    let req = {
      command: "add-album-frames",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "albumFrames": albumFrames,
      }
    };
    return this._sendRequest(req, callback);
  },

  addEmptyAlbumFrames: function(constructionId, albumId, frameCount, startPosition) {
    let req = {
      command: "add-empty-album-frames",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
        "frameCount": frameCount,
        "startPosition": startPosition
      }
    };
    return this._sendRequest(req);
  },

  getAlbumItemExtraInfo(constructionId, albumItemId) {
    let req = {
      command: "get-album-item-extra-info",
      args: {
        "constructionId" : constructionId,
        "albumItemId" : albumItemId
      }
    };
    return this._sendRequest(req);
  },

  getAlbumFrame: function (constructionId, albumId, albumFrameId) {
    let req = {
      command: 'get-album-frame',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
        'albumFrameId': albumFrameId
      }
    };
    return this._sendRequest(req);
  },

  getAlbumConstructionPhotoInformations: function(constructionId, albumId) {
    let request = {
      command: "get-album-construction-photo-infos",
      args: {
        "constructionId" : constructionId,
        "albumId" : albumId,
      }
    };
    return this._sendRequest(request);
  },

  // Settings

  getProgramSettings: function () {
    let req = {
      command: 'get-program-settings',
    };
    return this._sendRequest(req);
  },

  getConstructionSettings: function (constructionId) {
    let req = {
      command: 'get-construction-settings',
      args: {
        'constructionId': constructionId
      }
    };
    return this._sendRequest(req);
  },

  updateProgramSettings: function (programSettings) {
    let req = {
      command: 'update-program-settings',
      args: {
        'programSettings': programSettings
      }
    };
    return this._sendRequest(req);
  },

  updateConstructionSettings: function (constructionId, constructionSettings) {
    let req = {
      command: 'update-construction-settings',
      args: {
        'constructionId': constructionId,
        'constructionSettings': constructionSettings,
      }
    };
    return this._sendRequest(req);
  },

  getPrintSettings: function (constructionId, albumId) {
    let req = {
      command: 'get-print-settings',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
      }
    };
    return this._sendRequest(req);
  },

  updatePrintSettings: function (constructionId, albumId, printSettings) {
    let req = {
      command: 'update-print-settings',
      args: {
        'constructionId': constructionId,
        'albumId': albumId,
        'printSettings': printSettings
      }
    };
    return this._sendRequest(req);
  },

  // Search

  searchByFileInfo: function (constructionId, conditions, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-by-file-info',
      args: {
        'constructionId' : constructionId,
        'conditions' : conditions,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  searchBySentence: function (constructionId, conditions, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-by-sentence',
      args: {
        'constructionId' : constructionId,
        'conditions' : conditions,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  searchByConstructionInfo: function (constructionId, conditions, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-by-construction-info',
      args: {
        'constructionId' : constructionId,
        'conditions' : conditions,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  searchNotCompliantImages: function (constructionId, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-not-compliant-images',
      args: {
        'constructionId' : constructionId,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  searchSameImages: function (constructionId, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-same-images',
      args: {
        'constructionId' : constructionId,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  searchTamperingImages: function (constructionId, albumIds = [], callback=()=>{}) {
    let req = {
      command: 'search-tampering-images',
      args: {
        'constructionId' : constructionId,
        'albumIds' : albumIds,  // empty array - all albums
      }
    };
    return this._sendRequest(req, callback);
  },

  getManagedAlbumItems: function (constructionId, startPosition = 0, fetchCount = 1000, callback=()=>{}) {
    let req = {
      command: 'get-managed-album-items',
      args: {
        'constructionId': constructionId,
        'startPosition': startPosition,
        'fetchCount': fetchCount,
      }
    };
    return this._sendRequest(req, callback);
  },

  execSharedConstruction(constructionId, available = true) {
    let req = {
      command: "exec-shared-construction",
      args: {
        "constructionId": constructionId,
        "serialNumber": this.serialNumber,
        "hostName": this.hostName,
        "available": available,
        "appVersion": this.appVersion,
      }
    };
    return this._sendRequest(req);
  },

  lockSharedConstruction(constructionId, lock = true) {
    let req = {
      command: "lock-shared-construction",
      args: {
        "constructionId": constructionId,
        "serialNumber" : this.serialNumber,
        "hostName": this.hostName,
        "lock": lock,
      }
    };
    return this._sendRequest(req);
  },

  lockAlbum(constructionId, albumId, lock = true) {
    let req = {
      command: "lock-album",
      args: {
        "constructionId": constructionId,
        "serialNumber" : this.serialNumber,
        "hostName": this.hostName,
        "albumId": albumId,
        "lock": lock,
      }
    };
    return this._sendRequest(req);
  },

  lockAlbumItems(constructionId, lock = true) {
    let req = {
      command: "lock-album-items",
      args: {
        "constructionId": constructionId,
        "serialNumber" : this.serialNumber,
        "hostName": this.hostName,
        "lock": lock,
      }
    };
    return this._sendRequest(req);
  },

  unLockAll(constructionId) {
    let req = {
      command: "unlock-all",
      args: {
        "constructionId": constructionId,
        "serialNumber" : this.serialNumber,
      }
    };
    return this._sendRequest(req);
  },

  async getDataFromBookrackItems(bookrackItems, bookrackItemType, result) {
    for (let i = 0; i < bookrackItems.length; i++) {
      if (result == undefined) result = [];
      if (bookrackItems[i].bookrackItemType == bookrackItemType) {
        result.push(bookrackItems[i]);
      }
      if (bookrackItems[i].bookrackItems) {
        await this.getDataFromBookrackItems(bookrackItems[i].bookrackItems, bookrackItemType, result);
      }
    }

    return result;
  },

  syncConstruction(constructionId = 0, albumId = 0) {
    let req = {
      command: "sync-construction",
      args: {
        "constructionId": constructionId,
        "albumId": albumId,
      }
    };
    return this._sendRequest(req);
  },

  getSharedConstructionGroup(dataFolder) {
    let req = {
      command: "get-shared-construction-group",
      args: {
        "dataFolder" : dataFolder,
        "serialNumber" : this.serialNumber,
        "hostName" : this.hostName,
        "appVersion" : this.appVersion
      }
    };
    return this._sendRequest(req);
  },

  clearSharedConstructionHost(dataFolder, serialNumber, targetHost) {
    let req = {
      command: "clear-shared-construction-host",
      args: {
        "dataFolder" : dataFolder,
        "serialNumber" : serialNumber,
        "targetHost" : targetHost,
        "appVersion" : this.appVersion
      }
    };
    return this._sendRequest(req);
  },

  unlockSharedConstructionHost(dataFolder, serialNumber, targetHost) {
    let req = {
      command: "unlock-shared-construction-host",
      args: {
        "dataFolder" : dataFolder,
        "serialNumber" : serialNumber,
        "targetHost" : targetHost,
        "appVersion" : this.appVersion
      }
    };
    return this._sendRequest(req);
  },

  importConstruction(dataFolder, isExternalFolder=true, isSharedFolder=true, cloudStorage=0, isSample=false) {
    let req = {
      command: "import-construction",
      args: {
        "dataFolder" : dataFolder,
        "isExternalFolder" : isExternalFolder,
        "isSharedFolder" : isSharedFolder,
        "cloudStorage" : cloudStorage,
        "isSample" : isSample,
      }
    };
    return this._sendRequest(req);
  },

  getSharedLockOwners(constructionId) {
    let req = {
      command: "get-shared-lock-owners",
      args: {
        "constructionId" : constructionId,
        "serialNumber" : this.serialNumber,
        "hostName" : this.hostName,
        "appVersion" : this.appVersion
      }
    };
    return this._sendRequest(req);
  },

  execTransactionAlbumItems(constructionId, transactionType) {
    // transactionType 'begin', 'commit', 'rollback'
    let req = {
      command: "exec-transaction-album-items",
      args: {
        "constructionId" : constructionId,
        "transactionType" : transactionType,
      }
    };
    return this._sendRequest(req);
  },

  execTransactionAlbum(constructionId, albumId, transactionType, isGarbage = false) {
    // transactionType 'begin', 'commit', 'rollback'
    let req = {
      command: "exec-transaction-album",
      args: {
        "constructionId" : constructionId,
        "albumId" : albumId,
        "transactionType" : transactionType,
        "isGarbage" : isGarbage
      }
    };
    return this._sendRequest(req);
  },

  execTransactionGarbageAlbum(constructionId, transactionType, createGarbage) {
    // transactionType 'begin', 'commit', 'rollback'
    let id = createGarbage ? 0 : -1;
    return this.execTransactionAlbum(constructionId, id, transactionType, true);
  },

  getConnectRegisterState(constructionId, files, callback=()=>{}) {
    let req = {
      command: "get-connect-register-state",
      args: {
        "constructionId" : constructionId,
        "files" : files,
      }
    };
    return this._sendRequest(req, callback);
  },
  async getBusinessKeywordsJSON(knackId, businessKeywordFieldCode = "", 
                                businessKeywordLargeCode = "", 
                                businessKeywordMiddleCode = ""){
    return JSON.stringify(await this.getBusinessKeywords(knackId,businessKeywordFieldCode,
                                                          businessKeywordLargeCode,
                                                          businessKeywordMiddleCode))
  },

  //
  // Functions below are for temporary dummy operations.
  // these should be removed when the all command is implemented.
  // TODO: REMOVE THESE DUMMY FUNCTION.
  //
  _dummyRequest(request) {
    console.log("\n--------------------------- request ---------------------------\n");
    console.log(JSON.stringify(request, null, 2));
    console.log("\n--------------------------- response ---------------------------\n");
    return "dummy";
  },
  _dummyResponse(response, delay = 200, callback) {
    return new Promise((resolve, reject) => {

      if (callback) {
        if (callback) {
          callback("progress", 1,
            3, "start ");
        }

        setTimeout(() => {
          callback("progress", 2,
            3, "done  ");
        }, delay / 2);

      }
      setTimeout(() => {
        if (callback) {
          callback("progress", 3,
            3, "finish");
        }
        resolve(response);
      }, delay);
    });
  },

  _replaceCommandToDummy(command) { },

  _dummyPhotoTreePattern:0,

};

Object.setPrototypeOf(accessor, EventEmitter.prototype);
module.exports = accessor;
