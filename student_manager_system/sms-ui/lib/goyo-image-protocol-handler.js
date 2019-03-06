'use strict';

// Node.js modules.
const path = require('path');
const fs = require('fs');

// Electron modules.
const { app, protocol } = require('electron');

// goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('./goyo-log')('goyo-image-protocol-handler');

const KEEP_TEMP_FILES = 16;

//TODO:このモジュールを使用する場合、sync系の処理をすべてasyncにしないと
// TIFが大量にある場合速度が低下する

module.exports = {
  customSchema : 'file',
  //Note:有効化する場合、スキーマを下記へ変更する
  //customSchema : 'cnvf',
  tempFiles : new Set(),
  recently : [],
  
  async initialize() {
    logger.debug('initialize image-protocol-handler');

    /*
     * registerStreamProtocol is faster.
     * However, when dealing with large files, 
     * deleting files immediately may not be able to handle them properly.
     * Therefore, here use registerBufferProtocol.
     */
    protocol.registerBufferProtocol(this.customSchema, async (request, callback) => {
      logger.debug('registerBufferProtocol');
      logger.debug(' url=' + request.url);

      // get absolute path
      let url = decodeURI(request.url.substr(8));
      let indexP = url.indexOf('?_=');
      if (indexP > -1) {
        url = url.substr(0, indexP);
      }
      logger.debug(' file=' + url);

      const data = await this._createResponseData(url);
      callback(data);

    }, (error) => {
      if (error) logger.error('Failed to register protocol', error);
    });

  },

  async finalize() {
    logger.debug('finalize image-protocol-handler');

    protocol.unregisterProtocol(this.customSchema, (error) => {
      if (error) logger.error('Failed to unregister protocol', error);
    });

    // remove temp images
    for (let f of this.tempFiles.values()) {
      try {
        if (fs.existsSync(f)) {
          logger.debug('remove ' + f);
          fs.unlinkSync(f);
        }  
      } catch (e) {
        logger.error('failed to remove ' + f, e);
      }
    }
  },

  async _createResponseData(filePath) {
    /*
     * NOTE
     * Judgment by extension is inherently inadequate.
     * It is correct to judge properly according to the file structure
     */
    var extension = path.extname(filePath).toLowerCase();
    if (extension === '.tif' || extension === '.tiff') {
      logger.debug('internal convert');
      return await this._convertImage(filePath);
    }
    return fs.readFileSync(filePath);
  },
  
  _getTempFileName(filePath) {
    /*
     * When considering the mechanism of caching, use the path of the original file as a key.
     * However, it is necessary to deal with image editing.
     */
    let temp = app.getPath('temp');
    var extension = path.extname(filePath).toLowerCase();
    var fileName = path.basename(filePath, extension);
    let newFilePath = temp + '\\' + fileName +'.jpg';
    return newFilePath;
  },

  async _convertImage(filePath) {
    let newFilePath = this._getTempFileName(filePath);
    try {
      logger.debug(' dest=' + newFilePath);
      await bookrackAccessor.convertJpg(filePath, newFilePath);

      /*
       * if it delete a file immediately, Can not return the correct response
       * Therefore, delete the file at the end
       */
      this.addTempFiles(newFilePath);
      let data = fs.readFileSync(newFilePath);
      this.removeOldTempFile();
      //fs.unlinkSync(newFilePath);
      return data;

    } catch(e) {
      logger.error('Faild to convertJpg', e);
      return fs.readFileSync(filePath);
    }
  },

  addTempFiles(newFilePath) {
    this.tempFiles.add(newFilePath);

    this.recently = this.recently.filter(
      (f)=>{ return f !== newFilePath });
    this.recently.push(newFilePath);
  },

  removeOldTempFile() {
    if (this.tempFiles.size > KEEP_TEMP_FILES) {
      let f = this.recently[0];
      try {
        if (fs.existsSync(f)) {
          logger.debug('remove ' + f);
          fs.unlinkSync(f);
        }  
      } catch (e) {
        logger.error('failed to remove ' + f, e);
      }
      this.recently.splice(0, 1);
      this.tempFiles.delete(f);
    }
  }
};
