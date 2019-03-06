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
  MAX_SCHOOLS : 1000000,

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

  // school

  getSchools: function() {
    let req = { command: 'get-schools'};
    return this._sendRequest(req);
  },

  getSchoolDetail: function(schoolId) {
    let req = {
      command: 'get-school-detail',
      args: {'schoolId': schoolId}
    };
    return this._sendRequest(req);
  },

  updateSchool: function(school, callback = undefined) {

    this._fillSchoolPrameters(school);
    let req = {
      command: 'update-school',
      args: {'school': school}
    };
    return this._sendRequest(req, callback);
  },

  _getCreateDate : function() {
    let dt = new Date();
    let formatted = dateformat(dt, 'yyyy-mm-dd');
    return formatted;
  },

  getNewSchoolFolder : async function(parentFolder) {
    let response = await this.getSchools();
    let nextSchoolId = 1;
    const schoolIdList = response.schools
      .map(school => Number(school.schoolId))
      .filter(id => id != null && !isNaN(id))
    if ( schoolIdList.length > 0 ) {
      const maxSchoolId = Math.max.apply(null, schoolIdList);
      if ( maxSchoolId != null && !isNaN(maxSchoolId) ) {
        nextSchoolId = maxSchoolId + 1;
      }
    }
    const baseFolder = `${parentFolder}\\school${nextSchoolId}`;

    if (fs.existsSync(baseFolder) == false) {
      return baseFolder;
    }

    let folder = baseFolder;
      for (let i = 1; i <= this.MAX_SCHOOLS; i++) {
      folder = `${baseFolder}_${i}`;
      if (fs.existsSync(folder) == false) {
          break;
        }
      }
    return folder;
  },

  getSchoolFolderPathSet : async function() {
    // get current folder map
    let folderSet = new Set();
    try {
      let response = await this.getSchools();
      response.schools.forEach((school)=>{
        folderSet.add(school.dataFolder);
      });
    } catch (e) {
    }
    return folderSet;
  },

  copySchool: function(
    srcSchoolId, displayNumber, newDataFolder = '',useExternalFolder = false, useSharedFolder = false) {
  let school = {
    "createDate" : this._getCreateDate(),
    "guId" : uuidv4()
  };
  let req = {
    command: 'copy-school',
    args: {
      "srcSchoolId": srcSchoolId,
      "displayNumber" : displayNumber,
      "newDataFolder" : newDataFolder,
      "useExternalFolder" : useExternalFolder,
      "useSharedFolder" : useSharedFolder,
      "school" : school
    }
  };
  return this._sendRequest(req);
},

  deleteSchool: function(schoolId, deleteDirectory = true, callback = undefined) {
    let req = {
      command: 'delete-school',
      args: {
        'schoolId': schoolId,
        'deleteDirectory': deleteDirectory,
      }
    };
    return this._sendRequest(req, callback);
  },

  updateSchoolOrder: function(schools) {
    let req = {
      command: 'update-school-order',
      args: {
        'schools': schools,
      }
    };
    return this._sendRequest(req);
  },

  syncSchool(schoolId = 0, classId = 0) {
    let req = {
      command: "sync-school",
      args: {
        "schoolId": schoolId,
        "classId": classId,
      }
    };
    return this._sendRequest(req);
  },

  importSchool(dataFolder, isExternalFolder = true, isSharedFolder = true, cloudStorage = 0, isSample = false) {
    let req = {
      command: "import-school",
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

  // Album

  getAlbumDetail: function (schoolId, albumId) {
    let req = {
      command: 'get-album-detail',
      args: {
        'schoolId': schoolId,
        'albumId': albumId
      }
    };
    return this._sendRequest(req);
  },
 
  getAlbumFrames: function (schoolId, albumId, fetchFramePosition = 0, fetchCount = -1) {
    let req = {
      command: 'get-album-frames',
      args: {
        'schoolId': schoolId,
        'albumId': albumId,
        "fetchFramePosition": fetchFramePosition,
        "fetchCount": fetchCount
      }
    };
    return this._sendRequest(req);
  },

  getAlbumFrameIds: function (schoolId, albumId) {
    let req = {
      command: 'get-album-frame-ids',
      args: {
        'schoolId': schoolId,
        'albumId': albumId
      }
    };
    return this._sendRequest(req);
  },

  updateAlbum: function (schoolId, album) {
    let req = {
      command: "update-album",
      args: {
        "schoolId": schoolId,
        "album": album,
      }
    };
    return this._sendRequest(req);
  },

  deleteAlbum(schoolId, albumId, immediately = false, callback=()=>{}) {
    let req = {
      command: "delete-album",
      args: {
        "schoolId": schoolId,
        "albumId": albumId,
        "immediately" : immediately,
      }
    };
    return this._sendRequest(req, callback);
  },

  updateAlbumFrames: function (schoolId, albumId, albumFrames, callback=()=>{}) {
    let req = {
      command: 'update-album-frames',
      args: {
        'schoolId': schoolId,
        'albumId': albumId,
        'albumFrames': albumFrames
      }
    };
    return this._sendRequest(req, callback);
  },

  updateAlbumFrameOrder: function(schoolId, albumId, albumFrameIds, sortStartPosition = 0) {
    let req = {
      command: "update-album-frame-order",
      args: {
        "schoolId": schoolId,
        "albumId": albumId,
        "albumFrameIds": albumFrameIds,
        "sortStartPosition": sortStartPosition,
      }
    };
    return this._sendRequest(req);
  },

  deleteAlbumFrame: function(schoolId, albumId, albumFrameId, immediately = false) {
    let req = {
      command: "delete-album-frame",
      args: {
        "schoolId": schoolId,
        "albumId": albumId,
        "albumFrameId": albumFrameId,
        "immediately" : immediately,
      }
    };
    return this._sendRequest(req);
  },

  addAlbumFrames: function(schoolId, albumId, albumFrames, callback=()=>{}) {
    let req = {
      command: "add-album-frames",
      args: {
        "schoolId": schoolId,
        "albumId": albumId,
        "albumFrames": albumFrames,
      }
    };
    return this._sendRequest(req, callback);
  },

  addEmptyAlbumFrames: function(schoolId, albumId, frameCount, startPosition) {
    let req = {
      command: "add-empty-album-frames",
      args: {
        "schoolId": schoolId,
        "albumId": albumId,
        "frameCount": frameCount,
        "startPosition": startPosition
      }
    };
    return this._sendRequest(req);
  },

  getAlbumItemExtraInfo(schoolId, albumItemId) {
    let req = {
      command: "get-album-item-extra-info",
      args: {
        "schoolId" : schoolId,
        "albumItemId" : albumItemId
      }
    };
    return this._sendRequest(req);
  },

  getAlbumFrame: function (schoolId, albumId, albumFrameId) {
    let req = {
      command: 'get-album-frame',
      args: {
        'schoolId': schoolId,
        'albumId': albumId,
        'albumFrameId': albumFrameId
      }
    };
    return this._sendRequest(req);
  },

  getAlbumSchoolPhotoInformations: function(schoolId, albumId) {
    let request = {
      command: "get-album-school-photo-infos",
      args: {
        "schoolId" : schoolId,
        "albumId" : albumId,
      }
    };
    return this._sendRequest(request);
  },

  execTransactionAlbumItems(schoolId, transactionType) {
    // transactionType 'begin', 'commit', 'rollback'
    let req = {
      command: "exec-transaction-album-items",
      args: {
        "schoolId" : schoolId,
        "transactionType" : transactionType,
      }
    };
    return this._sendRequest(req);
  },

  execTransactionAlbum(schoolId, albumId, transactionType, isGarbage = false) {
    // transactionType 'begin', 'commit', 'rollback'
    let req = {
      command: "exec-transaction-album",
      args: {
        "schoolId" : schoolId,
        "albumId" : albumId,
        "transactionType" : transactionType,
        "isGarbage" : isGarbage
      }
    };
    return this._sendRequest(req);
  },

  execTransactionGarbageAlbum(schoolId, transactionType, createGarbage) {
    // transactionType 'begin', 'commit', 'rollback'
    let id = createGarbage ? 0 : -1;
    return this.execTransactionAlbum(schoolId, id, transactionType, true);
  },

  getConnectRegisterState(schoolId, files, callback=()=>{}) {
    let req = {
      command: "get-connect-register-state",
      args: {
        "schoolId" : schoolId,
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
