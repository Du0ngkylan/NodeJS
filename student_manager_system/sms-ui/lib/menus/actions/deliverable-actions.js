'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const { BookrackViewWindowSet } = require('../../goyo-window-controller');
const goyoDialog = require('../../goyo-dialog-utils');
const logger = require('../../goyo-log')('deliverable-actions');
const { holdWindowsStop } = require('../../goyo-utils');

const licenseManager = require('../../license/goyo-license-manager');
const goyoAppDefaults = require('../../goyo-app-defaults');
const bookrackAccessor = require('goyo-bookrack-accessor');

// Internal functions.
function findBookrackItem(bookrackItems, id) {
  for (let item of bookrackItems) {
    if (item.bookrackItemId === id) {
      return item;
    } else if (item.bookrackItems) {
      let result = findBookrackItem(item.bookrackItems, id);
      if (result) return result;
    } else {
      // Do nothing.
    }
  }
  return null;
}

function getAlbumIdsUnderBookrackItem(bookrackItem) {
  if (bookrackItem.bookrackItemType === 3) {
    return [bookrackItem.bookrackItemId];
  } else if (bookrackItem.bookrackItems) {
    return bookrackItem.bookrackItems.reduce((acc,item) => acc.concat(getAlbumIdsUnderBookrackItem(item)), []);
  } else {
    return [];
  }
}

function getAlbumIdsUnderContainer(bookrackItems, containerId) {
  let item = findBookrackItem(bookrackItems, containerId);
  if (item) {
    return getAlbumIdsUnderBookrackItem(item);
  } else {
    return [];
  }
}

const actions = {
  ///////////////////////////////////////////////////////////////////
  // Deliverable
  ///////////////////////////////////////////////////////////////////
  'DELIVERABLE:EXPORT': {
    // Action for 「電子納品データ出力...」
    async isRunnable(type, target) {
      let construction = await target.constructionInformation;
      if(construction.knack.knackType == 8 || construction.knack.knackType == 9) {
        return false;
      }
      return true;
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {

        if (licenseManager.licenseType === 'standard') {
          await goyoDialog.showLicenseRestrictionDialog(parent, 11);
          return;
        }

        let bookrackItems = await target.bookrackItems;

        // 1. Lists all albums as target.
        let targetAlbumIds;
        if (typeof target.compartmentId === 'number') {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
        } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
          targetAlbumIds = 
            target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
        } else {
          targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.bookrackId);
        }
        let result = await goyoDialog.showDeliverableDataOutputDialog(
          parent, target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('DELIVERABLE:EXPORT', e);
      } finally {
        holder.release();
      }
    },
  },
  'DELIVERABLE:IMPORT': {
    runnableWhileSharedLock : true,    
    async run(parent, target) {
      // Action for 「電子納品データ入力...」
      let holder = holdWindowsStop();
      try {

        if (licenseManager.licenseType === 'standard') {
          await goyoDialog.showLicenseRestrictionDialog(parent, 10);
          return;
        }

        let countConstruction = (await bookrackAccessor.getConstructions()).constructions.length;
        if (licenseManager.licenseType === 'trial' && 
          countConstruction >= goyoAppDefaults.TRIAL_MAX_CONSTRUCTIONS) {
          await goyoDialog.showLicenseRestrictionDialog(parent, 7);
          return;
        }

        let result = await goyoDialog.showDeliverableDataInputDialog(parent);
      } catch (e) {
        logger.error('DELIVERABLE:IMPORT', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;
