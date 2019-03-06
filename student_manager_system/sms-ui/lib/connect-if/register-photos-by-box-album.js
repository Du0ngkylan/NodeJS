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
    for (let i = 0; i < jsonData.length; ++i) {
      let data = jsonData[i];
      metaData[i] = await photoAccessor.getPhotoMetadata(data['files']);
    }
    return metaData;
  },
  findAlbumId: async function (clasificationObj, jsonData) {
    let result = [];
    for (let i = 0; i < jsonData.length; ++i) {
      let data = jsonData[i];
      //console.log("determineTargetAlbum box:" + data['box'] + ",album:" + data['album']);
      result[i] = await clasificationObj.determineTargetAlbum(data['box'], data['album'], BOX_COLOR);
      //console.log("determineTargetAlbum end");
    }
    return result;
  }, 
  ERROR_BOOKRACK_DATA: 1, // 本棚データエラー
  ERROR_FILE_IO: 2, //ファイルアクセス時のIOエラー
  ERROR_NONE_CLASSIFICATION: 3, // 仕分け情報がないため仕分け不可
  ERROR_GOYO19_UNSUPPORTED: 4, // 御用達19が対応していないファイル形式
  registerPhotosByBoxAlbum: async function (constructionId, jsonFile) {
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
    let fixClasification = new BTO.AlbumDistributorByFixClassification(constructionId);
    await fixClasification.create();

    let metaData = await this.getPhotoData(jsonData);
    let result = await this.findAlbumId(fixClasification, jsonData);

    let photoList = [];
    for (let cnt = 0; cnt < result.length; ++cnt) {
      let albumId = result[cnt];
      let albumFrames = [];
      //console.log("metaData[" + cnt + "]['results'].length:" + metaData[cnt]['results'].length);
      //console.log("metaData[" + cnt + "]['errors'].length:" + metaData[cnt]['errors'].length);
      Array.prototype.push.apply(errList, metaData[cnt]['errors']);

      if (albumId === null) {
        for (let i = 0; i < metaData[cnt]['results'].length; ++i) {
          let obj = metaData[cnt]['results'][i];
          errList.push({ "file": obj['FILE:OriginalName']['fieldValue'], error: this.ERROR_NONE_CLASSIFICATION });
        }
        continue;
      }

      for (let i = 0; i < metaData[cnt]['results'].length; ++i) {
        let obj = metaData[cnt]['results'][i];
        let constructPhotoInfomation = makePhotoInfo.fromKuraemonKokuban([obj]);
        albumFrames.push(albumLib.makeAlbumFrame(obj, constructPhotoInfomation));
        photoList.push({ "file": obj['FILE:OriginalName']['fieldValue'], albumId: albumId });
      }
      //console.log("add albumId:" + albumId);
      //console.log("albumFrames.length:" + albumFrames.length);
      try {
        let response = await bookrackAccessor.addAlbumFrames(constructionId, albumId, albumFrames);
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
        //console.log("response:"+JSON.stringify(response, null, 2));
      } catch (e) {
        //console.log("exception:" + e);
        for (let i = 0; i < metaData[cnt]['results'].length; ++i) {
          let obj = metaData[cnt]['results'][i];
          errList.push({ "file": obj['FILE:OriginalName']['fieldValue'], error: this.ERROR_BOOKRACK_DATA });
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
   // console.log(JSON.stringify(output, null, 2));
    return output;
  }
};

module.exports = accessor;