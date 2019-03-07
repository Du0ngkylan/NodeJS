'use strict';

// Node.js modules.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 3rd-party modules.
const filetype = require('file-type');

// Goyo modules.
const goyoDialog = require('../../goyo-dialog-utils');
const { holdWindowsStop, directoryWalk } = require('../../goyo-utils');
const goyoAppDefaults = require('../../goyo-app-defaults');
const logger = require('../../goyo-log')('develop-actions');

const { appEnv } = require('../../goyo-app-env');


const actions = {
  'DEVELOP:OPEN-VERSION-INFORMATION': { // Action for 「バージョン情報...」
    runnableWhileSharedLock : true,    
    isRunnable() {
      try {
        return appEnv.settings.mode === 'develop';
      } catch(e) {
        logger.error('DEVELOP:OPEN-VERSION-INFORMATION', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        const licenseManager = require('../../license/goyo-license-manager');
        const version = goyoAppDefaults.VERSION;
        await goyoDialog.showSimpleMessageDialog(
          parent,
          'バージョン情報',
          `製品名：\n　　${goyoAppDefaults.PRODUCT_NAME} ${licenseManager.licenseTypeName}\n\nバージョン：\n　　${version}`,
          'OK');
      } catch (e) {
        logger.error('DEVELOP:OPEN-VERSION-INFORMATION', e);
      } finally {
        holder.release();
      }
    },
  },
};

function removeInContainer(container, childItemId) {
  container.bookrackItems.some((element, index, array) => {
    if (element.bookrackItemId === childItemId) {
      container.bookrackItems.splice(index, 1);
      return true;
    }
  });
}

function getAlbumIdsUnderContainer(bookrackItems, containerId) {
  let item = findBookrackItem(bookrackItems, containerId);
  if (item) {
    return getAlbumIdsUnderBookrackItem(item);
  } else {
    return [];
  }
}

function getAlbumIdsUnderBookrackItem(bookrackItem) {
  if (bookrackItem.bookrackItemType === 3) {
    return [bookrackItem.bookrackItemId];
  } else if (bookrackItem.bookrackItems) {
    return bookrackItem.bookrackItems.reduce((acc, item) => acc.concat(getAlbumIdsUnderBookrackItem(item)), []);
  } else {
    return [];
  }
}

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

function makeTextFrameField(key, value, label="") {
  return {
    fieldKey: key,
    fieldValue: value,
    fieldLabel: label,
    hideSentence: 0,
    hideSentenceBackground: 0,
    textFrameId: 0,
  };
}

module.exports = actions;

