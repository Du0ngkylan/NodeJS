'use strict';

const { isSpecifiedExtension } = require('../../goyo-utils');

function isTiffAlbumFrame(frameInformation) {
  if (frameInformation == undefined
     || frameInformation.hasOwnProperty('photoFrames') == false
     || frameInformation.photoFrames.length == 0
     ) {
    return false;
  }
  let imageFile = frameInformation.photoFrames[0].imageFile;
  if (isSpecifiedExtension(imageFile, ['.tiff', '.tif'])) {
    return true;
  }
  return false;
}

function findAlbumInBookrackItems(items) {
  for (let item of items) {
    if (item.bookrackItemType === 3) {
      return true;
    } else if (findAlbumInBookrackItems(item.bookrackItems)) {
      return true;
    }
  }
  return false;
}

async function listTargetAlbums(target) {
  let targetAlbumIds;
  let bookrackItems = await target.bookrackItems;
  if (typeof target.compartmentId === 'number') {
    targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.compartmentId);
  } else if (target.boxIds.length > 0 || target.albumIds.length > 0) {
    targetAlbumIds = 
      target.boxIds.reduce((acc, boxId) => acc.concat(getAlbumIdsUnderContainer(bookrackItems, boxId)), target.albumIds);
  } else {
    targetAlbumIds = getAlbumIdsUnderContainer(bookrackItems, target.bookrackId);
  }
  return targetAlbumIds;
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

module.exports = {
  isTiffAlbumFrame,
  listTargetAlbums,
  getAlbumIdsUnderContainer,
  getAlbumIdsUnderBookrackItem,
  findBookrackItem,
  findAlbumInBookrackItems,
}
