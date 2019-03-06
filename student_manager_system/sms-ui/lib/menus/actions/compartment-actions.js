'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const settingsOperation = require('../../goyo-settings-operation');
const { holdWindowsStop } = require('../../goyo-utils');
const logger = require('../../goyo-log')('compartment-actions');

// Internal functions.
function findParentBookrackItem(item, targetId) {
  if (!item.bookrackItems) return null;

  let result = item.bookrackItems.find(i => i.bookrackItemId === targetId);
  if (result) return item;

  for (let i of item.bookrackItems) {
    let result = findParentBookrackItem(i, targetId);
    if (result) return result;
  }
  return null;
}


const actions = {
  ///////////////////////////////////////////////////////////////////
  // compartment
  ///////////////////////////////////////////////////////////////////
  'COMPARTMENT:NEW': {
    async isRunnable(type, target) {
      try {
        // This function assumes that the following conditions have been satisfied.
        //  * All target box/album are just under one bookrack.
        if (target.boxIds.length === 0 && target.albumIds.length === 0) return false;
        let bookrackItems = await target.bookrackItems;

        let selectItemIds = target.boxIds.concat(target.albumIds);

        let parentItem = null;
        for (let item of bookrackItems) {
          parentItem = findParentBookrackItem(item, selectItemIds[0]);
          if (parentItem) break;
        }
        if (!parentItem || parentItem.bookrackItemType !== 0) return false;

        return selectItemIds.every(
          id => parentItem.bookrackItems.some(item => item.bookrackItemId === id)
        );
      } catch (e) {
        logger.error('COMPARTMENT:NEW', e);
        return false;
      }
    },
    async run(parent, target) {
      // Action for 「仕切りを作成...」
      let holder = holdWindowsStop();
      try {
        await settingsOperation.createCompartment(parent, target.constructionId, target.boxIds.concat(target.albumIds));
      } catch (e) {
        logger.log('COMPARTMENT:NEW', e);
      } finally {
        holder.release();
      }
    },
  },
  'COMPARTMENT:EDIT': {
    async run(parent, target) {
      // Action for 「仕切りの設定...」
      assert(target.compartmentId !== null);
      let holder = holdWindowsStop();
      try {
        await settingsOperation.editCompartment(parent, target.constructionId, target.compartmentId);
      } catch (e) {
        logger.log('COMPARTMENT:EDIT', e);
      } finally {
        holder.release();
      }
    },
  },
  'COMPARTMENT:DELETE': {
    async run(parent, target) {
      // Action for 「仕切りを削除...」
      assert(target.compartmentId !== null);
      let holder = holdWindowsStop();
      try {
        await settingsOperation.deleteCompartment(parent, target.constructionId, target.compartmentId);
      } catch (e) {
        logger.log('COMPARTMENT:DELETE', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;