'use strict';

// Node.js modules.
const assert = require('assert');

// Electron modules.

// Goyo modules.
const searchOperation = require('../../goyo-search-operation');
const { holdWindowsStop } = require('../../goyo-utils');
const logger = require('../../goyo-log')('search-actions');

// Internal functions.
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
  // Search
  ///////////////////////////////////////////////////////////////////
  'SEARCH:BY-PHOTO-INFORMATION': { // Action for 「工事写真情報で検索...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:BY-PHOTO-INFORMATION', e);
        return false;
      }
    },
    async run(parent, target) {
      assert(target.constructionId !== undefined);
      let holder = holdWindowsStop();
      try {
        let constructionInformation = await target.constructionInformation;
        let knackType = constructionInformation.knack.knackType;
        let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];
        await searchOperation.searchConstructionPhotoInformation(parent, target.constructionId, targetAlbumIds, knackType, false);
      } catch (e) {
        logger.error('SEARCH:BY-PHOTO-INFORMATION', e);
      } finally {
        holder.release();
      }
    },
  },
  'SEARCH:BY-PHOTO-INFORMATION-AND-PRINT': { // Action for 「工事写真情報を検索して印刷...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:BY-PHOTO-INFORMATION-AND-PRINT', e);
        return false;
      }
    },
    async run(parent, target) {
      assert(target.constructionId !== undefined);
      let holder = holdWindowsStop();
      try {
        let constructionInformation = await target.constructionInformation;
        let knackType = constructionInformation.knack.knackType;
        let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];
        await searchOperation.searchConstructionPhotoInformation(parent, target.constructionId, targetAlbumIds, knackType, true);
      } catch (e) {
        logger.error('SEARCH:BY-PHOTO-INFORMATION-AND-PRINT', e);
      } finally {
        holder.release();
      }
    },
  },
  'SEARCH:IDENTICAL-PHOTOS': { // Action for 「同一画像を検索...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:IDENTICAL-PHOTOS', e);
        return false;
      }
    },
    async run(parent, target) {
      assert(target.constructionId !== undefined);
      let holder = holdWindowsStop();
      try {
        await searchOperation.searchIdenticalPhoto(parent, target);
      } catch (e) {
        logger.error('SEARCH:IDENTICAL-PHOTOS', e);
      } finally {
        holder.release();
      }
    },
  },
  'SEARCH:BY-FILENAME': { // Action for 「ファイル名で検索...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:BY-FILENAME', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];
        await searchOperation.searchPhotoFileName(parent, target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('SEARCH:BY-FILENAME', e);
      } finally {
        holder.release();
      }
    },
  },
  'SEARCH:MODIFIED1': { // Action for 「要領・基準に準拠しない画像を検索...」
    async isRunnable(type, target) {
      try {
        let construction = await target.constructionInformation;
        let knackType = construction.knack.knackType;
        if (knackType === 8 || knackType === 9) return false;

        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:MODIFIED1', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let construction = await target.constructionInformation;
        await searchOperation.searchEdittedImages(parent, target, construction.knack.knackType, construction.knack.knackId);
      } catch (e) {
        logger.error('SEARCH:MODIFIED1', e);
      } finally {
        holder.release();
      }
    }
  },
  'SEARCH:MODIFIED2': { // Action for 「編集・加工された画像を検索...」
    async isRunnable(type, target) {
      try {
        let construction = await target.constructionInformation;
        if (construction.knack.knackType !== 8 && construction.knack.knackType !== 9) return false;

        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:MODIFIED2', e);
        return false;
      }
    },
    async run(parent, target) {
      await actions['SEARCH:MODIFIED1'].run(parent, target);
    },
  },
  'SEARCH:BY-SENTENCE': { // Action for 「文字列を検索...」
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        logger.error('SEARCH:BY-SENTENCE', e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];
        await searchOperation.searchPhotoSentence(parent, target.constructionId, targetAlbumIds);
      } catch (e) {
        logger.error('SEARCH:BY-SENTENCE', e);
      } finally {
        holder.release();
      }
    },
  },
};


module.exports = actions;

