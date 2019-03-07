'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('../goyo-dialog-utils');
const goyoAppDefaults = require('../goyo-app-defaults');
const lockFactory = require('../lock-manager/goyo-lock-manager');
const logger = require('../goyo-log')('goyo-menu-actions');


const actions = Object.assign({},
  require('./actions/album-actions'),
  require('./actions/backup-actions'),
  require('./actions/box-actions'),
  require('./actions/compartment-actions'),
  require('./actions/construction-actions'),
  require('./actions/deliverable-actions'),
  require('./actions/develop-actions'),
  require('./actions/excel-actions'),
  require('./actions/photo-actions'),
  require('./actions/printing-actions'),
  require('./actions/search-actions'),
  require('./actions/special-actions')
);



class ActionTarget {
  constructor(obj) {
    if (obj) {
      assert(obj.constructionId!=null);
      this.constructionId = obj.constructionId;
      this.bookrackId = obj.bookrackId || null;
      this.compartmentId = obj.compartmentId || null;
      this.page = obj.page || null;
      //this.textFrameKey = obj.textFrameKey || null;
      //this.textFrameValue = obj.textFrameValue || null;
      this.quantityFramesPerPage = obj.quantityFramesPerPage || null;
      this.targetFrameId = obj.targetFrameId || null;
      this.selectedAlbum = obj.selectedAlbum || null;
      this.textFrame
        = (obj.textFrameDisable) ? { type: 'disable' }
        : (obj.textFrameKey != null && obj.textFrameFormat != null) ? { type: 'key', key: obj.textFrameKey, format: obj.textFrameFormat } 
        : { type: 'default' };

      if (obj.boxId instanceof Array) {
        this.boxIds = obj.boxId;
      } else if (typeof obj.boxId === 'number') {
        this.boxIds = [obj.boxId];
      } else {
        this.boxIds = [];
      }

      if (obj.albumId instanceof Array) {
        this.albumIds = obj.albumId;
      } else if (typeof obj.albumId === 'number') {
        this.albumIds = [obj.albumId];
      } else {
        this.albumIds = [];
      }

      if (obj.frameId instanceof Array) {
        assert(this.albumIds.length === 1);
        this.frameIds = obj.frameId;
      } else if (typeof obj.frameId === 'number') {
        assert(this.albumIds.length === 1);
        this.frameIds = [obj.frameId];
      } else {
        this.frameIds = [];
      }

      this._constructionInformation = null;
      this._constructionSettings = null;
      this._bookrackItems = null;
      this._albumDetails = null;
      this._frameInfomations = null;
    }
  }

  get constructionInformation() {
    if (!this._constructionInformation) {
      this._constructionInformation =
        bookrackAccessor.getConstructionDetail(this.constructionId, false).then(r => r.construction);
      //bookrackAccessor.getConstructionDetail(this.constructionId).then(r => { r.construction.knack.knackType=8; return r.construction; });
    }
    return this._constructionInformation;
  }

  get constructionSettings() {
    if (!this._constructionSettings) {
      this._constructionSettings =
        bookrackAccessor.getConstructionSettings(this.constructionId).then(r => r.constructionSettings);
      //bookrackAccessor.getConstructionSettings(this.constructionId).then(r => { r.constructionSettings.constructionPhoto.shoottingDeviceType=0 ;return r.constructionSettings; });
    }
    return this._constructionSettings;
  }

  get bookrackItems() {
    if (!this._bookrackItems) {
      this._bookrackItems = bookrackAccessor.getBookrackItems(this.constructionId)
        .then(r => r.bookrackItems);
    }
    return this._bookrackItems;
  }

  get albumDetails() {
    if (!this._albumDetails) {
      let promises = this.albumIds.map(
        id => bookrackAccessor.getAlbumDetail(this.constructionId, id).then(r => r.albumDetail)
      )
      this._albumDetails = Promise.all(promises);
    }
    return this._albumDetails;
  }

  get frameInformations() {
    if (!this._frameInfomations) {
      let promises = this.frameIds.map(id => {
        return bookrackAccessor.getAlbumFrame(this.constructionId, this.albumIds[0], id);
      })
      this._frameInfomations = Promise.all(promises);
    }
    return this._frameInfomations;
  }
}

module.exports = {
  ActionTarget,

  async isRunnable(actionId, type, target, options) {
    let action = actions[actionId];
    if (!(action instanceof Object)) {
      return false;
    } else if (action.isRunnable instanceof Function) {
      return await action.isRunnable(type, target, options)
    } else {
      return action.run instanceof Function;
    }
  },

  async run(actionId, parent, target) {
    try {
      let action = actions[actionId];
      if (action.runnableWhileSharedLock !== true) {
        // don't check "runnableWhileSharedLock" property === true
        // otherwise, check other shared lock owners
        if (await this.checkSharedLock(target.constructionId)) {
          await goyoDialog.showWarningMessageDialog(
            parent,
            goyoAppDefaults.DIALOG_TITLE, 
            `この工事は他のコンピュータで使用中のため、\nこの操作を行うことはできません。`,
            'OK');  
          return;
        }
      }
      await action.run(parent, target)
    } catch (e) {
      logger.error(`Failed to run ${actionId}`, e);
    }
  },

  async checkSharedLock(constructionId) {
    try {
      let lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
      let result = await lockManager.existSharedLockOwners();
      logger.debug(`constructionId=${constructionId}, checkSharedLock=${result}`);
      return result;
    } catch(e) {
      logger.error('Failed to lockManager', e);
      return false;
    }
  },

};