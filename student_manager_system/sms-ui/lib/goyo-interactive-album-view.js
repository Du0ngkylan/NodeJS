'use strict';

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const {
  AlbumWindowSet,
  BookrackViewWindowSet
} = require('./goyo-window-controller');

const goyoDialog = require('./goyo-dialog-utils');
const logger = require('./goyo-log')('goyo-interactive-album-view');
const { holdWindowsStop } = require('./goyo-utils');


module.exports = {
  async startAlbumFrameView(parent, constructionId, frameInformations) {
    let holders = [];

    await goyoDialog.showSearchResultControlDialog(parent, frameInformations, async (idx, item) => {
      let info = frameInformations[idx];
      logger.debug(`select idx:${idx}, frameId:${info.frameId}`);
      let albumView = AlbumWindowSet.get(constructionId, info.albumId);
      if (!albumView) {
        albumView = AlbumWindowSet.open(constructionId, info.albumId, info.frameId);
        holders.push(holdWindowsStop([await albumView.window]));
      } else {
        albumView.showAndFocus(null, info.frameId);
      }
      return albumView;
    });

    holders.forEach(h => h.release());
  },

  async startFrameDeletingView(parent, constructionId, frameInformations) {
    let holders = [];

    await goyoDialog.showIdenticalPhotoDeleteWindow(null, frameInformations,
      async (idx) => {
        let info = frameInformations[idx];
        logger.debug(`select-begin: ${idx}, frameId:${info.frameId}, albumFrameId:${info.albumFrameId}, displayNumber: ${info.displayNumber}`);
        let albumView = AlbumWindowSet.get(constructionId, info.albumId);
        if (!albumView) {
          albumView = AlbumWindowSet.open(constructionId, info.albumId, info.frameId);
          holders.push(holdWindowsStop([await albumView.window]));
        } else {
          albumView.showAndFocus(null, info.frameId);
        }
      },
      async (indices) => {
        // delete here
        logger.debug(`delete-begin indices:${indices}`);
      },
    );

    holders.forEach(h => h.release());
  },
};