'use strict';

// Node.js modules.
const assert = require('assert');
// Electron modules.

// Goyo modules.
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const settingsOperation = require('../../goyo-settings-operation');
const goyoDialog = require('../../goyo-dialog-utils');
const goyoConstructionOperation = require('../../goyo-construction-operation');
const logger = require('../../goyo-log')('construction-actions');
const { holdWindowsStop } = require('../../goyo-utils');


// Internal functions.
function unimplemented() {
  console.log('menu-actions: unimplemented action is executed');
}

const actions = {
  ///////////////////////////////////////////////////////////////////
  // Construction
  ///////////////////////////////////////////////////////////////////
  'CONSTRUCTION:EDIT-INFORMATION': { // Action for 「工事情報...」
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        // parent.minimize();
        await goyoConstructionOperation.edit(parent, target.constructionId);
      } catch (e) {
        await goyoDialog.showErrorMessageDialog(
          parent,
          'エラー',
          '工事情報の更新に失敗しました。',
          'OK');
      } finally {
        //parent.show();
        holder.release();
      }
    },
  },
  'CONSTRUCTION:LOAD-FROM-FOLDER': {
    async isRunnable(type, target) {
      // TODO:release後対応?
      return false;
    },
    async run(parent, target) {
      // Action for 「データフォルダを読み込み...」
      unimplemented();
    },
  },
  'CONSTRUCTION:CHANGE-KNACK': {
    async run(parent, target) {
      // Action for 「電子納品要領変更」
      let holder = holdWindowsStop();
      try {
        let cInfo = await target.constructionInformation;
        let result = await goyoDialog.showKnackChangeDialog(parent, {constructionId : target.constructionId,knack: cInfo.knack});
        if (result) {
          settingsOperation.emit('changeKnack', result.cInfo.knack);
        }
      } catch (e) {
        logger.error('CONSTRUCTION:CHANGE-KNACK', e);
      } finally {
        holder.release();
      }
    },
  },
  'CONSTRUCTION:EDIT-SETTING': {
    async run(parent, target) {
      // Action for 「本棚の設定...」
      let holder = holdWindowsStop();
      try {
        let result = await settingsOperation.editBookrackSetting(parent, target.constructionId);
      } catch (e) {
        logger.error('CONSTRUCTION:EDIT-SETTING', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;