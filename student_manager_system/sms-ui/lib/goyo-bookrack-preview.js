'use strict';
const assert = require('assert');

var dummyData = {
  albumDetail: null,
  bookrackItems: null,
  constructionDetail: null,
  constructions: null,
  albums: null,
  systemAlbums: null
};

module.exports = {
  // This function will be called K-51 本棚プレビュー window.
  addDummyData(data) {
    dummyData = {
      albumDetail: data.albumDetail,
      bookrackItems: data.bookrackItems,
      constructionDetail: data.constructionDetail,
      constructions: data.constructions,
      albums: data.albums,
      systemAlbums: data.systemAlbums
    };
  },
  removeDummyData() {
    dummyData = {
      albumDetail: null,
      bookrackItems: null,
      constructionDetail: null,
      constructions: null,
      albums: null,
      systemAlbums: null
    };
  },

  // These functions will be called from bookrack_window.
  dummyAccessor: {
    _dummyResponse(response, delay = 200, callback) {
      return new Promise((resolve, reject) => {
        if (callback) {
          if (callback) {
            callback("progress", 1,
              3, "start ");
          }
          setTimeout(() => {
            callback("progress", 2,
              3, "done  ");
          }, delay / 2);
            
        }
        setTimeout(() => {
          if (callback) {
            callback("progress", 3,
              3, "finish");
          }
          resolve(response);
        }, delay);
      });
    },

    getAlbumDetail(constructionId, albumId) {
      let album = dummyData.albums.find(function (album) {
        return album.albumId === albumId;
      })
      dummyData.albumDetail.albumDetail.albumSettings.albumName = album.albumName;
       return dummyData.albumDetail;
    },
    getBookrackItems(constructionId) {
       return dummyData.bookrackItems;
    },
    getConstructionDetail(constructionId) {
      return dummyData.constructionDetail;
    },
    getConstructions() {
      return dummyData.constructions;
    },
    getSystemAlbums() {
      return dummyData.systemAlbums;
    },
    getAlbumFrames(constructionId, albumId, fetchFramePosition = 0, fetchCount = 10000) {
      let response = {
        "albumFrameTotalCount" : 0,
        "albumFilesFolder": "dummy folder",
        "albumFrames" : [
          {
            "albumFrameId" : 1,
            "referenceSouceAlbumFrameId" : 0,
            "constructionPhotoInformation" : {
              "写真情報": {
                "写真-大分類": "工事",
                "写真区分": "施工状況写真",
                "工種": "堤脚保護工",
                "種別": "コンクリートブロック工",
                "細別": "遮水シート張",
                "写真タイトル": "基準高出来型測定",
                "工種区分予備": "工種区分予備１ 工種区分予備２",
                "撮影箇所": "No.10+1",
                "撮影年月日": "20171002",
                "施工管理値": "基準高 H1 20.125 20.120 m 基準高 H2 20.200 20.180 m",
                "請負者説明文": "受注者側で検査立会者、特筆事項情況等、特筆事項があれば記入する。",
                "代表写真": "1",
                "提出頻度写真": "0",              
              }
            },
            "photoFrames" : [ // always 1 frame
              {
                "photoFrameId" : 1,
                "albumItemId" : 1,
                "imageFile" : "dummy data",
                "thumbnail" : "dummy data",
                "fileArias" : "フロアA1.jpg",
                "fileSize" : 253,   // KB
                "width" : 1280,
                "height" : 960,
                "shootingDate" : "2018:04:26 20:11:56+09:00",
              }
            ],
            "textFrames" : {
              "shootingSpot" : {
                "textFrameId" : 1,
                "fieldKey" : "shootingSpot",
                "fieldLabel" : "撮影場所",
                "fieldValue" : "フロアA",
                "hideSentence" : 0,
                "hideSentenceBackground" : 0,
                },
              "note" : {
                "textFrameId" : 2,
                "fieldKey" : "note",
                "fieldLabel" : "備考",
                "fieldValue" : "フロア全体を撮影した写真",
                "hideSentence" : 0,
                "hideSentenceBackground" : 0,
                },
            },
          }
        ],
      };
      return response;
    },
    updateBookrackItemOrder() {
      assert(false);
    },
    deleteBookrackItem(constructionId, itemId) {
      assert(false);
    }
  }
};


