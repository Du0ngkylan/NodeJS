'use strict';

// Node.js modules.
const EventEmitter = require('events');

// Electron modules.
const { BrowserWindow } = require('electron');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const { windowHandler, BookrackViewWindowSet } = require('./goyo-window-controller');
const goyoDialog = require('./goyo-dialog-utils');


async function displayPhotoSequentially(photoList, bookrackId) {
  let bookrackViewWindowSet = BookrackViewWindowSet.getInstance(bookrackId);

  let emitter = new EventEmitter();
  emitter.on('prev', async function() {
    console.log('next clicked');
  });
  emitter.on('next', async function(photoInfo) {
    console.log('next clicked');
    await bookrackViewWindowSet.openAlbumWindowSet(photoInfo.albumId, photoInfo.photoId);
  });

  return await goyoDialog.showSearchResultControlDialog(null, emitter, photoList);
}

async function checkPhotoDelete(photoList) {

}


module.exports = {

  searchConstructionPhotoInformation: async function(parent, bookrackId) {
    try {
      let searchInfo = await goyoDialog.showPhotoInformationSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      // let searchResult = await bookrackAccessor.searchPhotos( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      //   constructionPhotoInformation: searchInfo.searchParameter,
      //   photoFileName: null,
      //   photoSentence: null,
      // });
      let searchResult = [ 
        // this is dummy data.
        { bookrackId: 1, albumId: 2, photoId: 10 },
        { bookrackId: 1, albumId: 3, photoId: 11 },
        { bookrackId: 1, albumId: 4, photoId: 12 },
      ];


      if (searchInfo.displayType==='DISPLAY_ONE_BY_ONE') {
        await displayPhotoSequentially(searchResult, bookrackId);
      } else if (searchInfo.displayType==='CREATE_NEW_ALBUM') {
        // TODO: アルバム作成の実装
      } else {
      }
    } catch(e) {
      console.log('searchConstructionPhotoInformation error: ', e);
    }
  },

  searchPhotoSentence: async function(parent) {{
    try {
      let searchInfo = await goyoDialog.showStringSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      let searchResult = [ ];
      searchInfo.displayType='CREATE_NEW_ALBUM';
      // let searchResult = await bookrackAccessor.searchPhoto( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      //   constructionPhotoInformation: searchInfo.searchParameter,
      //   photoFileName: null,
      //   photoSentence: null,
      // });

      if (true || searchInfo.displayType==='DISPLAY_ONE_BY_ONE') {
        await displayPhotoSequentially(searchResult);
      } else if (searchInfo.displayType==='CREATE_NEW_ALBUM') {
      } else {
      }
    } catch(e) {
      console.log('searchPhotoSentence error: ', e);
    }
  }
  },

  searchPhotoFileName: async function(parent) {
    try {
      let searchInfo = await goyoDialog.showFilenameSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      let searchResult = [ ];
      searchInfo.displayType='DISPLAY_ONE_BY_ONE';
      // let searchResult = await bookrackAccessor.searchPhoto( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      //   constructionPhotoInformation: searchInfo.searchParameter,
      //   photoFileName: null,
      //   photoSentence: null,
      // });

      if (searchInfo.displayType==='DISPLAY_ONE_BY_ONE') {
        await displayPhotoSequentially(searchResult);
      } else if (searchInfo.displayType==='CREATE_NEW_ALBUM') {
      } else {
      }
    } catch(e) {
      console.log('searchPhotoSentence error: ', e);
    }
  },

  searchIdenticalPhoto: async function(parent) {
    try {
      let searchInfo = await goyoDialog.showIdenticalImageSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      let searchResult = [ ];
      searchInfo.displayType='DISPLAY_ONE_BY_ONE';
      // let searchResult = await bookrackAccessor.searchIdenticalPhoto( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      // });

      if (true || searchInfo.displayType==='OK') {
        await checkPhotoDelete(searchResult);
      } else {
      }
    } catch(e) {
      console.log('searchPhotoSentence error: ', e);
    }
  },

  searchEdittedImages: async function(parent) {
    try {
      let searchInfo = await goyoDialog.showEdittedImageSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      let searchResult = [ ];
      searchInfo.displayType='DISPLAY_ONE_BY_ONE';
      // let searchResult = await bookrackAccessor.searchPhoto( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      //   constructionPhotoInformation: searchInfo.searchParameter,
      //   photoFileName: null,
      //   photoSentence: null,
      // });

      if (true || searchInfo.displayType==='DISPLAY_ONE_BY_ONE') {
        await displayPhotoSequentially(searchResult);
      } else if (searchInfo.displayType==='CREATE_NEW_ALBUM') {
      } else {
      }
    } catch(e) {
      console.log('searchPhotoSentence error: ', e);
    }
  },

  searchKnackUncompliant: async function(parent) {
    try {
      let searchInfo = await goyoDialog.showEdittedImageSearchDialog(parent);
      if (!searchInfo) return;

      // TODO: 検索実行
      let searchResult = [ ];
      searchInfo.displayType='DISPLAY_ONE_BY_ONE';
      // let searchResult = await bookrackAccessor.searchPhoto( {
      //   bookrackId: bookrackId, 
      //   albumId: searchInfo.targetAlbum,
      //   constructionPhotoInformation: searchInfo.searchParameter,
      //   photoFileName: null,
      //   photoSentence: null,
      // });

      if (true || searchInfo.displayType==='DISPLAY_ONE_BY_ONE') {
        await displayPhotoSequentially(searchResult);
      } else if (searchInfo.displayType==='CREATE_NEW_ALBUM') {
      } else {
      }
    } catch(e) {
      console.log('searchPhotoSentence error: ', e);
    }
  },

};


