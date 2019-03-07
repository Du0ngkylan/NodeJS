'use strict';

// Node.js modules.
// ...

// Electron modules.
// ...

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const logger = require('./goyo-log');

const LIMIT_SEARCH_RESULT_COUNT = 1000;

function findBookrackItem(bookrackItemId, bookrackItems) {
  for (let i = 0; i < bookrackItems.length; i++) {
    if (bookrackItems[i].bookrackItemId === bookrackItemId)
      return bookrackItems[i];
    if (bookrackItems[i].bookrackItems) {
      const result =
        findBookrackItem(bookrackItemId, bookrackItems[i].bookrackItems);
      if (result) return result;
    }
  }
  return null;
}

function findAlbumIdsInBookrack(bookrackItems) {
  let albumIds = [];
  for (let i = 0; i < bookrackItems.length; i++) {
    if (bookrackItems[i].bookrackItemType === 3) {
      albumIds.push(bookrackItems[i].bookrackItemId);
    } else if (bookrackItems[i].bookrackItems) {
      const result = findAlbumIdsInBookrack(bookrackItems[i].bookrackItems);
      albumIds = albumIds.concat(result);
    }
  }
  return albumIds;
}

module.exports = {

  searchConstructionPhotoInformation: async function (
    parent, constructionId, targetAlbumIds, knackType, actionPrint = false) {
    let progressWindow = null;
  },

  searchPhotoSentence: async function (parent, constructionId, targetAlbumIds) {
    let progressWindow = null;
  },

  searchPhotoFileName: async function (parent, constructionId, targetAlbumIds) {
    let progressWindow = null;
  },

  searchIdenticalPhoto: async function (parent, target) {
    let progressWindow = null;
  },

  searchEdittedImages: async function (parent, target, knackType, knackId) {
    let progressWindow = null;
  },
};


function getText() {
  if (this._text == null) {
    this._text = metadataToText(this.albumFileAlias, this.extraInfo);
  }
  return this._text;
}

function metadataToText(imageFile, extraInfo) {
  let result = '';
  return result;
}

function getSameImgHash(resultSearchSameImg) {
  /* resultSearchSameImg=[
      {
        "albumId" : 1,
        "albumFrameId" : 3,
        "displayNumber" : 4,
        "sameGroupId" : 1,
        "albumFileAlias" : "写真1.jpg",
        "fileSize" : 235, //KB
        "modifyDate" : "2017-09-28 10:24:32"
        "extraInfo":{
          FILE:FileDate:"zzzz",
          FILE:FileSize:123,
          FILE:HASH:""eb9c917df20a2f4cfc4ca311de800d38933e080eeccedc9c3ba2f0f229aba752" <= the same image have the same FILE:HASH
      },
    ] */
  let arrImgHash = [];
  let identicalImages = [];
  for (let img of resultSearchSameImg) {
    let index = arrImgHash.indexOf(img.extraInfo['FILE:HASH'])
    if (index == -1) {
      arrImgHash.push(img.extraInfo['FILE:HASH'])
      identicalImages.push([img])
    }
    else {
      identicalImages[index].push(img)
    }
  }
  let results = [];
  for (let identicalImage of identicalImages) {
    if (identicalImage.length >= 2) {
      results.push(identicalImage)
    }
  }
  return results;
}

function getAlbumsFromBookrack(bookrackItems, result) {
  if (!bookrackItems) {
    return result;
  }

  for (let item of bookrackItems) {
    if (item.bookrackItemType === 3) {
      result.push(item);
    } else {
      result = getAlbumsFromBookrack(item.bookrackItems, result);
    }
  }
  return result;
}

function getNameAlbum(arrAlbums, albumId) {
  let name = '';
  for (let bookrack of arrAlbums) {
    if (bookrack.bookrackItemId == albumId) {
      name = bookrack.bookrackItemName;
      break;
    }
  }
  return name;
}

function getArrIdenticalPhotoWithText(arrAlbumsInBookrack, arrIdenticalImages) {
  let lenArrAlbumsInBookrack = arrAlbumsInBookrack.length;
  let lenArrIdenticalImages = arrIdenticalImages.length;
  let arrAlbumIdInBookrack = [];
  for (let album of arrAlbumsInBookrack) {
    arrAlbumIdInBookrack.push(album.bookrackItemId)
  }
  for (let i = 0; i < lenArrIdenticalImages; i++) {
    let identicalImage = arrIdenticalImages[i];
    for (let j = 0; j < identicalImage.length; j++) {
      let indexOfAlbum =
        arrAlbumIdInBookrack.indexOf(identicalImage[j].albumId);
      let nameAlbum =
        getNameAlbum(arrAlbumsInBookrack, identicalImage[j].albumId);
      let text = `[ ${i + 1}]` + identicalImage[j].albumFileAlias +
        `(${indexOfAlbum + 1}/${lenArrAlbumsInBookrack}: ${nameAlbum})`;
      arrIdenticalImages[i][j].text = text;
    }
  }
  let results = [];
  for (let identicalImages of arrIdenticalImages) {
    for (let img of identicalImages) {
      results.push(img)
    }
  }
  return results;
}

async function getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds) {
  // target albums?
  let albumIds = [];
  let { bookrackItems } = await bookrackAccessor.getBookrackItems(constructionId);
  if (searchInfo.targetIsAll) {
    albumIds = await findAlbumIdsInBookrack(bookrackItems);
  } else {
    albumIds = targetAlbumIds
      .map(targetAlbumId => findBookrackItem(targetAlbumId, bookrackItems))
      .reduce((result, bookrackItem) => {
        //台帳の場合
        if (bookrackItem.bookrackItemType == 3) {
          result.push(bookrackItem.bookrackItemId);
          return result;
        }
        //Boxの場合
        bookrackItem.bookrackItems.forEach(childItem => result.push(childItem.bookrackItemId))
        return result
      }, [])
  }

  //削除した画像アルバムを対象から除外
  const albumDetails = await Promise.all(albumIds.map(albumId => bookrackAccessor.getAlbumDetail(constructionId, albumId)))
  return albumDetails
    .filter(album => album.albumDetail.albumType != 2)
    .map(album => album.albumDetail.albumId)
}

// if search target all albums in the backend, it can not cancel
// therefore, search by album unit and combine results
async function searchByFileInfo(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow) {

  // target albums?
  let albumIds = await getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds);

  let total = albumIds.length + 1;
  let done = 0;

  let searchResults = [];
  for (let albumId of albumIds) {
    let searchResult = await bookrackAccessor.searchByFileInfo(
      constructionId, searchInfo.searchParameter, [albumId]);
    if (canceller.cancel) {
      break;
    }
    searchResults = searchResults.concat(searchResult.searchResults);
    done++;
    progressWindow.setProgress(done / total);

    if (searchResults.length > LIMIT_SEARCH_RESULT_COUNT) {
      canceller.limitOver = true;
      searchResults.length = LIMIT_SEARCH_RESULT_COUNT;
      progressWindow.setProgress(0.9);
      break;
    }
  }

  return searchResults;
}

// if search target all albums in the backend, it can not cancel
// therefore, search by album unit and combine results
async function searchBySentence(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow) {

  // target albums?
  let albumIds = await getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds);

  let total = albumIds.length + 1;
  let done = 0;

  let searchResults = [];
  for (let albumId of albumIds) {
    let searchResult = await bookrackAccessor.searchBySentence(
      constructionId, searchInfo.searchParameter, [albumId]);

    if (canceller.cancel) {
      break;
    }
    searchResults = searchResults.concat(searchResult.searchResults);
    done++;
    progressWindow.setProgress(done / total);
    if (searchResults.length > LIMIT_SEARCH_RESULT_COUNT) {
      canceller.limitOver = true;
      searchResults.length = LIMIT_SEARCH_RESULT_COUNT;
      progressWindow.setProgress(0.9);
      break;
    }
  }

  return searchResults;
}

// if search target all albums in the backend, it can not cancel
// therefore, search by album unit and combine results
async function searchByConstructionInfo(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow) {

  // target albums?
  let albumIds = await getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds);

  let total = albumIds.length + 1;
  let done = 0;
  let searchResults = [];
  for (let albumId of albumIds) {
    let searchResult = await bookrackAccessor.searchByConstructionInfo(
      constructionId, searchInfo.searchParameter, [albumId]);
    if (canceller.cancel) {
      break;
    }
    searchResults = searchResults.concat(searchResult.searchResults);
    done++;
    progressWindow.setProgress(done / total);
    if (searchResults.length > LIMIT_SEARCH_RESULT_COUNT) {
      canceller.limitOver = true;
      searchResults.length = LIMIT_SEARCH_RESULT_COUNT;
      progressWindow.setProgress(0.9);
      break;
    }
  }

  return searchResults;
}

// if search target all albums in the backend, it can not cancel
// therefore, search by album unit and combine results
async function searchNotCompliantImages(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow) {

  // target albums?
  let albumIds = await getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds);

  let total = albumIds.length + 1;
  let done = 0;
  let searchResults = [];
  for (let albumId of albumIds) {
    let searchResult = await bookrackAccessor.searchNotCompliantImages(
      constructionId, [albumId]);
  if (canceller.cancel) {
      break;
    }
    searchResults = searchResults.concat(searchResult.searchResults);
    done++;
    progressWindow.setProgress(done / total);
    if (searchResults.length > LIMIT_SEARCH_RESULT_COUNT) {
      canceller.limitOver = true;
      searchResults.length = LIMIT_SEARCH_RESULT_COUNT;
      progressWindow.setProgress(0.9);
      break;
    }
  }

  return searchResults;
}

// if search target all albums in the backend, it can not cancel
// therefore, search by album unit and combine results
async function searchSameImages(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow) {

  // target albums?
  let albumIds = await getTargetAlbumIds(constructionId, searchInfo, targetAlbumIds);

  let total = albumIds.length + 1;
  let done = 0;
  let searchResults = [];
  for (let albumId of albumIds) {
    let searchResult = await bookrackAccessor.searchSameImages(
      constructionId, [albumId]);
    if (canceller.cancel) {
      break;
    }
    // when grouping by sameGroupId, 
    // regrouping is necessary after combining all the arrays
    // however,currently not using sameGroupId
    // therefore, you only have to combine the arrays
    searchResults = searchResults.concat(searchResult.searchResults);
    done++;
    progressWindow.setProgress(done / total);
    if (searchResults.length > LIMIT_SEARCH_RESULT_COUNT) {
      canceller.limitOver = true;
      searchResults.length = LIMIT_SEARCH_RESULT_COUNT;
      progressWindow.setProgress(0.9);
      break;
    }
  }

  return searchResults;
}

async function showLimitOverResultDialog(parent, count) {
  await goyoDialog.showSimpleMessageDialog(
    parent, goyoAppDefaults.DIALOG_TITLE,
    `検索結果が${LIMIT_SEARCH_RESULT_COUNT}件以上のため、検索を中断しました。\n${count}件の結果を処理します。`, 'OK');
}

async function createSearchResultAlbumFrames(constructionId, searchResults, canceller) {
  let searchResultAlbumFrames = [];
  const GET_ALL_COUNT = 30;
  
  let albumMap = new Map();
  for (let result of searchResults) {
    if (!albumMap.has(result.albumId)) {
      albumMap.set(result.albumId, []);
    }
    let albumFrameIds = albumMap.get(result.albumId);
    albumFrameIds.push(result.albumFrameId);
  }

  for (const albumId of albumMap.keys()){
    let albumFrameIds = albumMap.get(albumId);
    if (albumFrameIds.length < GET_ALL_COUNT) {
      logger.debug(`fetch one loop(albumId=${albumId})`);
      for (let albumFrameId of albumFrameIds) {
        let albumFrame =
        (await bookrackAccessor.getAlbumFrame(
          constructionId, albumId, albumFrameId))
          .albumFrame;
        searchResultAlbumFrames.push(albumFrame);
      }
    } else {
      logger.debug(`fetch all(albumId=${albumId})`);
      let { albumFrames } = await bookrackAccessor.getAlbumFrames(
        constructionId, albumId);

      for (let albumFrame of albumFrames) {
        if (albumFrameIds.indexOf(albumFrame.albumFrameId) >= 0) {
          searchResultAlbumFrames.push(albumFrame);
        }
      }
    }
  };

  return searchResultAlbumFrames;
}

async function createSearchResultAlbum(constructionId, targetAlbumId, sentenceDisplayType = 1) {
  return 1;
}

/**
 * 対象の台帳を含む本棚を取得する
 */
function getBaseBoocktackItem(albumId, bookrackItems) {
  return bookrackItems.find( bookrackItem => findBookrackItem(albumId, bookrackItem.bookrackItems) != null )
}