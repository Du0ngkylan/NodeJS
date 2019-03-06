'use strict';

// Electron modules.
const { protocol } = require('electron');

// 3rd-party modules.
const yazl = require('yazl');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('./goyo-log')('goyo-goyozip-protocol-handler');

module.exports = {
  async initialize () {
    logger.debug('initialize goyozip-protocol-handler');
    protocol.registerStreamProtocol('goyozip', async (request, callback) => {
      try {
        let detail = this._getDetail(request.url);
        let streamData = await this._getStream(detail.constructionId, detail.albumId, detail.frameIds);
        callback({ data: streamData });
        logger.debug(`goyozip handled url: ${request.url}`);
      } catch(e) {
        logger.error('goyozip protocol handler', e);
        callback({
          statusCode: 500,
        });
      }
    }, (error) => {
      if (error) logger.error('Failed to register protocol');
    })
  },
  async finalize() {
    protocol.unregisterProtocol('goyozip', (error) => {
      if (error) logger.error('Failed to unregister protocol', error);
    });
  },
  async _getStream(constructionId, albumId, frameIds) {
    let zipFile = new yazl.ZipFile();
    let frames = await Promise.all(frameIds.map(frameId => {
      return bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId).then(r=>r.albumFrame);
    }));

    for (const frame of frames) {
      if (frame.photoFrames.length > 0) {
        zipFile.addFile(frame.photoFrames[0].imageFile, frame.photoFrames[0].fileArias);
      }
    }
    zipFile.end();
    return zipFile.outputStream;
  },
  _getDetail(url) {
    let detail = {};
    let path = url.split('/');
    let ids = path[path.length - 1].split('=')[1].split(',');
    detail.frameIds = [];
    for (let index = 0; index < ids.length; index++) {
      detail.frameIds[index] = Number(ids[index]);
    }
    detail.albumId = Number(path[path.length - 2]);
    detail.constructionId = Number(path[path.length - 3]);
    return detail;
  }
}

