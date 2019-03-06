'use strict';

// Node.js modules.
//const assert = require('assert');
const fse = require('fs-extra');

// 3rd-parth modules.

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const photoAccessor = require('photo-metadata-accessor');
const BTO = require('../bookrack-tree-operation');
const makePhotoInfo = require('../construction-photo-information/make');
const albumLib = require('../goyo-album-frame');

const BOX_COLOR = 0;

var accessor = {
  getPhotoData: async function (jsonData) {
    let metaData = [];
    //console.log("jsonData:"+JSON.stringify(jsonData, null, 2));
    if (0 < jsonData.length) {
      metaData = await photoAccessor.getPhotoMetadata(jsonData);
    }
    return metaData;
  },
  saveAlbumIdFrame: async function (id, frame) {
    let org = await this.loadAlbumIdFrame(id);
    if (org !== null) {
      org['frame'].push(frame);
      return;
    }
    this.albumIdFrames.push({ id: id, frame: [frame] });
    return;
  },
  loadAlbumIdFrame: async function (id) {
    for (let i = 0; i < this.albumIdFrames.length; ++i) {
      let obj = this.albumIdFrames[i];
      if (obj['id'] !== id) {
        continue;
      }
      return obj;
    }
    return null;
  },
  ERROR_BOOKRACK_DATA: 1, // 本棚データエラー
  ERROR_FILE_IO: 2, //ファイルアクセス時のIOエラー
  ERROR_NONE_CLASSIFICATION: 3, // 仕分け情報がないため仕分け不可
  ERROR_GOYO19_UNSUPPORTED: 4, // 御用達19が対応していないファイル形式
  albumIdFrames: [],
  registerPhotosByKokubanRule: async function (constructionId, jsonFile) {
    this.albumIdFrames = [];
    let jsonData = [];
    let errList = [];
    let okList = [];
    try {
      let data = await fse.readFile(jsonFile);
      jsonData = JSON.parse(data);
    } catch (e) {
      console.log("exception:" + e);
      return null;
    }
    let connectRule = new BTO.AlbumDistributorByConnectRule(constructionId);
    await connectRule.create();

    let metaData = await this.getPhotoData(jsonData);
    Array.prototype.push.apply(errList, metaData['errors']);

    for (let i = 0; i < metaData['results'].length; ++i) {
      let obj = metaData['results'][i];
      //console.log("obj i=" + i + ":" + JSON.stringify(obj, null, 2));
      let constructPhotoInformation = makePhotoInfo.fromKuraemonKokuban([obj]);
      //console.log("constructPhotoInformation:"+JSON.stringify(constructPhotoInformation,null,2));
      let albumId = await connectRule.determineTargetAlbum(constructPhotoInformation, BOX_COLOR);

      if (albumId === null) {
        errList.push({ "file": obj['FILE:OriginalName']['fieldValue'], error: this.ERROR_NONE_CLASSIFICATION });
        continue;
      }
      let albumFrame = albumLib.makeAlbumFrame(obj, constructPhotoInformation);
      await this.saveAlbumIdFrame(albumId, albumFrame);
    }

    //console.log("albumIdFrames:" + JSON.stringify(this.albumIdFrames, null, 2));
    //console.log("albumIdFrames.length:" + this.albumIdFrames.length);
    for (let i = 0; i < this.albumIdFrames.length; ++i) {
      let data = this.albumIdFrames[i];
      try {
        let response = await bookrackAccessor.addAlbumFrames(constructionId, data['id'], data['frame']);
        for (let i = 0; i < response['success'].length; ++i) {
          let line = response['success'][i];
          line['file'] = line['sourceFilePath'];
          line['albumId'] = line['albumFrameId'];
          delete line['sourceFilePath'];
          delete line['albumFrameId'];
          okList.push(line);
        }
        for (let i = 0; i < response['failure'].length; ++i) {
          let line = response['failure'][i];
          line['file'] = line['sourceFilePath'];
          line['error'] = this.ERROR_BOOKRACK_DATA;
          delete line['sourceFilePath'];
          errList.push(line);
        }
      } catch (e) {
        //console.log("XXX exception:" + e);
        for (let i = 0; i < data['frame'].length; ++i) {
          //console.log("XXX data:"+JSON.stringify(data, null, 2));
          let obj = data['frame'][i];
          errList.push({ "file": obj['photoFrames'][0]['imageFile'], error: this.ERROR_BOOKRACK_DATA });
        }
      }
    }

    let failuer = [];
    for (let i = 0; i < errList.length; ++i) {
      let data = errList[i];
      let errCode = 0;
      if (data.hasOwnProperty('message')) {
        let line = data['message'];
        if (line.match(/(File not found:\s)/)) {
          errCode = this.ERROR_FILE_IO;
        }
        else if (line.match(/(Unsupported file format:\s)/)) {
          errCode = this.ERROR_GOYO19_UNSUPPORTED;
        }
        else {
          errCode = data['message'];
        }
        failuer.push({ "file": data['SourceFile'], error: errCode });
      } else {
        failuer.push(data);
      }
    }
    let output = {};
    output['success'] = okList;
    output['failure'] = failuer;
    //console.log(JSON.stringify(output, null, 2));
    return output;
  }
};

module.exports = accessor;