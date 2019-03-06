'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const { viewMode, BookrackViewWindowSet } = require('../../goyo-window-controller');
const settingsOperation = require('../../goyo-settings-operation');
const logger = require('../../goyo-log')('box-actions');
const { holdWindowsStop, waitEffect } = require('../../goyo-utils');


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

function findAlbum(items) {
  for (let item of items) {
    if (item.bookrackItemType === 3) {
      return true;
    } else if (findAlbum(item.bookrackItems)) {
      return true;
    }
  }
  return false;
}


const actions = {
  ///////////////////////////////////////////////////////////////////
  // Box
  ///////////////////////////////////////////////////////////////////
  'BOX:EDIT-SETTING': {
    async run(parent, target) {
      // Action for 「BOXの設定...」
      assert(target.boxIds.length === 1);

      let holder = holdWindowsStop();
      try {
        await settingsOperation.editBoxSetting(parent, target.constructionId, target.boxIds[0]);
      } catch (e) {
        logger.error('BOX:EDIT-SETTING', e);
      } finally {
        holder.release();
      }
    },
  },
  'BOX:DELETE': {
    async run(parent, target) {
      // Action for 「BOXを削除」
      assert(target.boxIds.length === 1);

      let holder = holdWindowsStop();
      try {
        await settingsOperation.deleteBox(parent, target.constructionId, target.boxIds[0]);
      } catch (e) {
        logger.error('BOX:DELETE', e);
      } finally {
        holder.release();
      }
    },
  },
  'BOX:NEW': { // Action for 「BOXを作成」
    async isRunnable(type, target) {
      try {
        // Check condition below
        //  * All target album is not in any box.
        //  * All target album is in same compartment or same bookrack.
        //  * Any box is not selected.
        if (target.boxIds.length > 0 || target.albumIds.length === 0) return false;
        let bookrackItems = await target.bookrackItems;

        let parentItem = null;
        for (let item of bookrackItems) {
          parentItem = findParentBookrackItem(item, target.albumIds[0]);
          if (parentItem) break;
        }
        if (!parentItem || parentItem.bookrackItemType === 2) return false;

        return target.albumIds.every(
          id => parentItem.bookrackItems.find(item => item.bookrackItemId === id)
        );
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    async run(parent, target) {
      assert(target.albumIds !== undefined && target.albumIds.length > 0);

      let holder = holdWindowsStop();
      try {
        await settingsOperation.createBox(parent, target.constructionId, target.albumIds);
      } catch (e) {
        logger.error('BOX:NEW', e);
      } finally {
        holder.release();
      }
    },
  },
  'BOX:NEW-BY-PHOTO-CLASSIFICATION': { // Action for 「BOXを作成してアルバムを整頓する写真区分でアルバムを整頓する...」
    async isRunnable(type, target) {
      try {
        assert(target.constructionSettings !== undefined);
        let settings = await target.constructionSettings;
        if (settings.constructionPhoto.shoottingDeviceType === 0) {
          let bookrackItems = await target.bookrackItems;
          return findAlbum(bookrackItems);  
        }
      } catch (e) {
      }
      return false;
    },
    async run(parent, target) {
      let waitCursor;
      // Because there are no way to show progress dialog, we use effectCursor() function instead of progress
      // Reference to task 10935, action 「BOXを作成してアルバムを整頓する写真区分でアルバムを整頓する...」
      waitCursor = waitEffect(parent);
      try {
        await settingsOperation.editBoxByPhotoClassification(parent, target.constructionId, target.bookrackId);
      } catch (e) {
        logger.error('BOX:NEW-BY-PHOTO-CLASSIFICATION', e);
      } finally {
        if (waitCursor) {
          waitCursor.release();
        }
      }
    },
  },
  'BOX:NEW-BY-CONSTRUCTION-TYPE': { // Action for 「BOXを作成してアルバムを整頓する工種でアルバムを整頓する...」
    async isRunnable(type, target) {
      try {
        assert(target.constructionSettings !== undefined);
        let settings = await target.constructionSettings;
        if (settings.constructionPhoto.shoottingDeviceType === 0) {
          let bookrackItems = await target.bookrackItems;
          return findAlbum(bookrackItems);  
        }
      } catch (e) {
      }
      return false;
    },
    async run(parent, target) {
      let waitCursor;
      // Because there are no way to show progress dialog, we use effectCursor() function instead of progress
      // Reference to task 10935, action 「BOXを作成してアルバムを整頓する工種でアルバムを整頓する...」
      waitCursor = waitEffect(parent);
      try {
        await settingsOperation.editBoxByConstructionType(parent, target.constructionId, target.bookrackId);
      } catch (e) {
        logger.log('BOX:NEW-BY-CONSTRUCTION-TYPE', e);
      } finally {
        if (waitCursor) {
          waitCursor.release();
        }
      }
    },
  },
};


module.exports = actions;