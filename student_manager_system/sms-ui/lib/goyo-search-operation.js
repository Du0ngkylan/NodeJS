'use strict';

// Node.js modules.
// ...

// Electron modules.
// ...

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoInteractive = require('./goyo-interactive-album-view');
const goyoAppDefaults = require('./goyo-app-defaults');
const photoMetadataUtils = require('./photo-metadata-utils');
const goyoAlbumOperation = require('./goyo-album-operation');
const logger = require('./goyo-log')('goyo-search-operation');
const printOperation = require('./print-operation');
const { AlbumWindowSet } = require('./goyo-window-controller');

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
    try {
      let searchInfo = await goyoDialog.showPhotoInformationSearchDialog(
        parent, knackType, actionPrint);
      if (!searchInfo) return;

      const canceller = { cancel: false, limitOver : false };
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });

      let completeProgress = async ()=> {
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
        await progressWindow.close();
        progressWindow = null;
        if (!canceller.cancel && canceller.limitOver) {
          await showLimitOverResultDialog(parent, searchResults.length);
        }
      };

      let searchResults = await searchByConstructionInfo(constructionId, 
        searchInfo, targetAlbumIds, canceller, progressWindow);

      if (canceller.cancel) {
        await completeProgress();
        return;
      }
      
      if (searchResults.length === 0) {
        
        // non result
        await completeProgress();
        await goyoDialog.showSimpleMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '該当するものは見つかりませんでした。', 'OK');

      } else if (searchInfo.displayType === 'DISPLAY_ONE_BY_ONE') {
        // show result
        for (let result of searchResults) {
          // result.getText = getText;
          result.frameId = result.albumFrameId;
          Object.defineProperty(result, 'text', { get: getText });
        }
        await completeProgress();

        logger.debug('startAlbumFrameView start');
        await goyoInteractive.startAlbumFrameView(
          null, constructionId, searchResults);
        logger.debug('startAlbumFrameView finished');

      } else if (searchInfo.displayType === 'CREATE_NEW_ALBUM' || searchInfo.displayType === 'PRINT_PREVIEW') {
        
        let searchResultAlbumFrames = await createSearchResultAlbumFrames(constructionId, searchResults, canceller);
        if (canceller.cancel) {
          await completeProgress();
          return;
        }
        let newAlbumId = await createSearchResultAlbum(constructionId, targetAlbumIds[0]);

        await goyoAlbumOperation.insertFrames(
          constructionId, newAlbumId[0], searchResultAlbumFrames);

        await completeProgress();

        if (searchInfo.displayType === 'PRINT_PREVIEW') {
          // This window allows only one instance at a time.
          // return null if it has one instance already.
          await printOperation.startPreview(
            parent, constructionId, newAlbumId[0], 'photo_information');
        }

      }
    } catch (e) {
      logger.error('searchConstructionPhotoInformation', e);
    } finally {
      if (progressWindow != null) {
        progressWindow.close();
      }
    }
  },

  searchPhotoSentence: async function (parent, constructionId, targetAlbumIds) {
    let progressWindow = null;
    try {
      let searchInfo = await goyoDialog.showStringSearchDialog(parent);
      if (!searchInfo) return;

      const canceller = { cancel: false, limitOver : false };
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });

      let completeProgress = async ()=> {
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
        await progressWindow.close();
        progressWindow = null;
        if (!canceller.cancel && canceller.limitOver) {
          await showLimitOverResultDialog(parent, searchResults.length);
        }
      };

      let searchResults = await searchBySentence(constructionId, searchInfo, 
        targetAlbumIds, canceller, progressWindow);

      if (canceller.cancel) {
        await completeProgress();
        return;
      }  

      if (searchResults.length === 0) {

        await completeProgress();
        await goyoDialog.showSimpleMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '該当するものは見つかりませんでした。', 'OK');

      } else if (searchInfo.displayType === 'DISPLAY_ONE_BY_ONE') {
        // await displayPhotoSequentially(searchResult);
        for (let result of searchResults) {
          // result.getText = getText;
          result.frameId = result.albumFrameId;
          Object.defineProperty(result, 'text', { get: getText });
        }
        await completeProgress();

        await goyoInteractive.startAlbumFrameView(
          null, constructionId, searchResults);

      } else if (searchInfo.displayType === 'CREATE_NEW_ALBUM') {
        let newAlbumId = await createSearchResultAlbum(constructionId, targetAlbumIds[0], 0);

        let searchResultAlbumFrames = await createSearchResultAlbumFrames(constructionId, searchResults, canceller);
        if (canceller.cancel) {
          await completeProgress();
          return;
        }

        await goyoAlbumOperation.insertFrames(
          constructionId, newAlbumId[0], searchResultAlbumFrames);
        
        await completeProgress();

        await AlbumWindowSet.open(constructionId, newAlbumId[0]);
      }
    } catch (e) {
      logger.error('searchPhotoSentence', e);
    } finally {
      if (progressWindow != null) {
        await progressWindow.close();
      }
    }
  },

  searchPhotoFileName: async function (parent, constructionId, targetAlbumIds) {
    let progressWindow = null;
    try {  
      let searchInfo = await goyoDialog.showFilenameSearchDialog(parent);
      if (!searchInfo) return;

      const canceller = { cancel: false, limitOver : false };
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });

      let completeProgress = async ()=> {
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
        await progressWindow.close();
        progressWindow = null;
        if (!canceller.cancel && canceller.limitOver) {
          await showLimitOverResultDialog(parent, searchResults.length);
        }
      };

      let searchResults = await searchByFileInfo(constructionId, searchInfo, 
        targetAlbumIds, canceller, progressWindow);

      if (canceller.cancel) {
        await completeProgress();
        return;
      }

      if (searchResults.length === 0) {
        await completeProgress();

        await goyoDialog.showSimpleMessageDialog(
          parent, goyoAppDefaults.DIALOG_TITLE,
          '該当するものは見つかりませんでした。', 'OK');

      } else if (searchInfo.displayType === 'DISPLAY_ONE_BY_ONE') {

        for (let result of searchResults) {
          // result.getText = getText;
          result.frameId = result.albumFrameId;
          Object.defineProperty(result, 'text', { get: getText });
        }
        await completeProgress();

        await goyoInteractive.startAlbumFrameView(
          null, constructionId, searchResults);

      } else if (searchInfo.displayType === 'CREATE_NEW_ALBUM') {

        let searchResultAlbumFrames = await createSearchResultAlbumFrames(constructionId, searchResults, canceller);
        if (canceller.cancel) {
          await completeProgress();
          return;
        }
        let newAlbumId = await createSearchResultAlbum(constructionId, targetAlbumIds[0]);

        await goyoAlbumOperation.insertFrames(
          constructionId, newAlbumId[0], searchResultAlbumFrames);

        await completeProgress();

        await AlbumWindowSet.open(constructionId, newAlbumId);
      }

    } catch (e) {
      logger.error('searchPhotoFileName', e);
    } finally {
      if (progressWindow != null) {
        await progressWindow.close();
      }
    }
  },

  searchIdenticalPhoto: async function (parent, target) {
    let progressWindow = null;
    try {
      let searchInfo = await goyoDialog.showIdenticalImageSearchDialog(parent);
      if (!searchInfo) return;

      let constructionId = target.constructionId;
      let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];

      let bookrackItems = await target.bookrackItems;
      let albumsInBookrack = await getAlbumsFromBookrack(bookrackItems, []);

      const canceller = { cancel: false, limitOver : false };
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });

      let completeProgress = async ()=> {
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
        await progressWindow.close();
        progressWindow = null;
        if (!canceller.cancel && canceller.limitOver) {
          await showLimitOverResultDialog(parent, searchResults.length);
        }
      };

      let searchResults = await searchSameImages(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow);

      if (canceller.cancel) {
        await completeProgress();
        return;
      }

      searchResults.forEach(img => { img.frameId = img.albumFrameId; });

      let arrIdenticalImages = getSameImgHash(searchResults)
      await completeProgress();

      if (arrIdenticalImages.length <= 0) {
        goyoDialog.showSimpleMessageDialog(parent,
          '情報',
          '同一画像は見つかりませんでした。',
          'OK');
        return;
      }
      
      let arrIndenticalPhoto = getArrIdenticalPhotoWithText(albumsInBookrack, arrIdenticalImages)
      await goyoInteractive.startFrameDeletingView(parent,
        target.constructionId, arrIndenticalPhoto);

    } catch (e) {
      logger.error('searchIdenticalPhoto', e);
    } finally {
      if (progressWindow != null) {
        await progressWindow.close();
      }
    }
  },

  searchEdittedImages: async function (parent, target, knackType, knackId) {
    let progressWindow = null;
    try {
      let searchInfo = await goyoDialog.showEdittedImageSearchDialog(parent, knackType);
      if (!searchInfo) return;

      let constructionId = target.constructionId;
      let targetAlbumIds = target.albumIds.length > 0 ? target.albumIds : [target.selectedAlbum];
      const canceller = { cancel: false, limitOver : false };
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });

      let completeProgress = async ()=> {
        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
        await progressWindow.close();
        progressWindow = null;
        if (!canceller.cancel && canceller.limitOver) {
          await showLimitOverResultDialog(parent, searchResults.length);
        }
      };

      let searchResults = await searchNotCompliantImages(constructionId, searchInfo, targetAlbumIds, canceller, progressWindow);
      
      if (canceller.cancel) {
        await completeProgress();
        return;
      }

      if (searchResults.length) {

        for (let i = 0; i < searchResults.length; i++) {
          let { albumFrame } = await bookrackAccessor.getAlbumFrame(target.constructionId, searchResults[i].albumId, searchResults[i].albumFrameId);
          let illegals = await goyoAlbumOperation.checkFrame({ knackType, knackId }, albumFrame);
          searchResults[i].frameId = searchResults[i].albumFrameId;
          Object.defineProperty(searchResults[i], 'frameInfoText', { get: getText });
          Object.defineProperty(searchResults[i], 'text', {
            get: () => {
              return illegals.length > 0 ? illegals[0].toString() + '\n' + searchResults[i].frameInfoText
                : searchResults[i].frameInfoText;
            }
          });

          if (canceller.cancel) {
            await completeProgress();
            return;
          }
        }
        logger.debug(`searchResults: ${JSON.stringify(searchResults)}`);
        await completeProgress();

        await goyoInteractive.startAlbumFrameView(
          null, target.constructionId, searchResults);

      } else {

        await completeProgress();
        await goyoDialog.showSimpleMessageDialog(
          parent, '情報', '編集・加工された画像は見つかりませんでした。',
          'OK');
        
      }
    } catch (e) {
      logger.error('searchEdittedImages', e);
    } finally {
      if (progressWindow != null) {
        await progressWindow.close();
      }
    }
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
  let formatted =
    photoMetadataUtils.getFormattedMetadataAll(imageFile, extraInfo);

  let fileInfoText =
    formatted.fileInfos.map(fi => `【${fi.label}】${fi.value}`).join('\n');
  if (fileInfoText !== '') {
    result += '<<一般的な情報>>\n' + fileInfoText;
  }

  let additionalInfoText =
    formatted.additionalInfos.map(fi => `【${fi.label}】${fi.value}`)
      .join('\n');
  let exifInfoText =
    formatted.exifInfos.map(fi => `【${fi.label}】${fi.value}`).join('\n');
  if (exifInfoText !== '' || additionalInfoText !== '') {
    result += '\n<<付加情報>>\n' + additionalInfoText + exifInfoText;
  }

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
  let albumSettings = await goyoAlbumOperation.defaultAlbumSettings;

  albumSettings.albumName = '検索結果';
  albumSettings.initialPageNumber = 0;
  albumSettings.sentence.displayType = sentenceDisplayType;

  let bookrackItems =
    await bookrackAccessor.getBookrackItems(constructionId);
  let bookrackBaseItem = getBaseBoocktackItem(
    targetAlbumId, bookrackItems.bookrackItems);

  let newAlbumId = await goyoAlbumOperation.createAlbums(
    constructionId, bookrackBaseItem.bookrackItemId,
    null, 1,
    albumSettings, null,
    null, 'after');

  return newAlbumId;
}

/**
 * 対象の台帳を含む本棚を取得する
 */
function getBaseBoocktackItem(albumId, bookrackItems) {
  return bookrackItems.find( bookrackItem => findBookrackItem(albumId, bookrackItem.bookrackItems) != null )
}