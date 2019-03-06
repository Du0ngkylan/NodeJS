
'use strict';

// Node.js modules.
const assert = require('assert');

// 3rd-parth modules.

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const photoInfomationTree = require('./photo-information-tree/photo-information-tree');

const BOOKRACK_ITEM_TYPE_BOOKRACK = 0;
const BOOKRACK_ITEM_TYPE_SHIKIRI = 1;
const BOOKRACK_ITEM_TYPE_BOX = 2;
const BOOKRACK_ITEM_TYPE_ALBUM = 3;
const SPECIAL_TYPE_SYSTEM = 1;
const TYPE_ROOT = 0;
const TYPE_DAIBUNRUI = 1;
const TYPE_KUBUN = 2;
const TYPE_KOUSYU = 3;
const TYPE_SYUBETU = 4;
const TYPE_SAIBETU = 5;
const TYPE_KOUJISYUMOKU = 6;  // 現在、未使用
const TYPE_SEKOUJYOUKYOU = 7; // 現在、未使用
const TYPE_SYOUSAI = 8;       // 現在、未使用
const SYSTEM_ALBUM_NAME_NONE = '振り分けできない写真';
const DUMMY_ALBUM_FRAME_TOTAL_COUNT = 18;

class AlbumDistributor {
  constructor(constructionId) {
    assert.ok(constructionId !== null, "parameter constructionId is needed.");
    this._constructionId = constructionId;
    this._bookrackItems = null;
    this._systemAlbumNoneId = null;
    this._systemBookrackId = { name: null, id: null };
  }

  async initialize() {
    try {
      this._bookrackItems = await bookrackAccessor.getBookrackItems(this._constructionId);
      assert.ok(this._bookrackItems.hasOwnProperty('bookrackItems') === true, "none bookrackItems");
    } catch (e) {
      console.log("initialize exception:" + e);
    }
  }
  get constructionId() { return this._constructionId; }
  get bookrackItems() { return this._bookrackItems; }

  async getSystemBookrack() {
    if (this._systemBookrackId['id'] !== null) {
      return this._systemBookrackId;
    }
    let response = this._bookrackItems;
    for (let i = 0; i < response['bookrackItems'].length; ++i) {
      let obj = response['bookrackItems'][i];
      if (obj['bookrackItemType'] !== BOOKRACK_ITEM_TYPE_BOOKRACK) {
        continue;
      }
      if (obj['specialType'] !== SPECIAL_TYPE_SYSTEM) {
        continue;
      }
      if (obj.hasOwnProperty('bookrackItems') === false) {
        continue;
      }
      this._systemBookrackId = { name: obj['bookrackItemName'], id: obj['bookrackItemId'] };
      break;
    }
    return this._systemBookrackId;
  }
  async getSystemAlbumNone() {
    if (this._systemAlbumNoneId !== null) {
      return this._systemAlbumNoneId;
    }
    let response = this._bookrackItems;
    for (let i = 0; i < response['bookrackItems'].length; ++i) {
      let obj = response['bookrackItems'][i];
      if (obj['bookrackItemType'] !== BOOKRACK_ITEM_TYPE_BOOKRACK) {
        continue;
      }
      if (obj['specialType'] !== SPECIAL_TYPE_SYSTEM) {
        continue;
      }
      if (obj.hasOwnProperty('bookrackItems') === false) {
        continue;
      }
      for (let i = 0; i < obj['bookrackItems'].length; ++i) {
        let item = obj['bookrackItems'][0];
        if (item['bookrackItemType'] !== BOOKRACK_ITEM_TYPE_ALBUM) {
          continue;
        }
        if (item['bookrackItemName'] !== SYSTEM_ALBUM_NAME_NONE) {
          continue;
        }
        this._systemAlbumNoneId = item['bookrackItemId'];
        return this._systemAlbumNoneId;
      }
    }

    let parentId = null;
    for (let i = 0; i < response['bookrackItems'].length; ++i) {
      let obj = response['bookrackItems'][i];
      if ((obj['bookrackItemType'] === BOOKRACK_ITEM_TYPE_BOOKRACK) &&
        (obj['specialType'] === SPECIAL_TYPE_SYSTEM)) {
        parentId = obj['bookrackItemId'];
        break;
      }
    }
    assert.ok(parentId !== null);
    let albumParam = {
      "albumId": 0,   // 0 - create, otherwise - update
      "parentBookrackItemId": parentId,
      "displayNumber": 1,
      "albumFrameTotalCount": DUMMY_ALBUM_FRAME_TOTAL_COUNT,
      "albumSettings": {
        "albumName": SYSTEM_ALBUM_NAME_NONE
      }
    }
    // console.log("JSON albumParam:" + JSON.stringify(albumParam, null, 2));
    try {
      response = await bookrackAccessor.updateAlbum(this._constructionId, albumParam);
    } catch (e) {
      console.error("exception: updateAlbum() :" + e);
      return null;
    }
    this._systemAlbumNoneId = response['albumId'];
    return this._systemAlbumNoneId;
  }
}

class AlbumDistributorByJacicXmp extends AlbumDistributor {
  constructor(constructionId) {
    super(constructionId);
    this._albumIds = [];
    this._albumDetailMap = {};
  }

  async create() {
    await super.initialize();
    this._albumIds = await this.getAlbumIds();
    this._albumDetailMap = new Map();
  }

  async getAlbumIds() {
    let albumIds = [];
    let response = super.bookrackItems;
    response['bookrackItems'].forEach(function (bookrackItem) {
      searchAlbumId(bookrackItem);
    });
    return albumIds;

    function searchAlbumId(bookrackItem) {
      assert.ok(bookrackItem.hasOwnProperty('bookrackItemType') === true);

      if (bookrackItem['bookrackItemType'] === BOOKRACK_ITEM_TYPE_ALBUM) {
        albumIds.push(bookrackItem['bookrackItemId']);
      }

      if (bookrackItem.hasOwnProperty('bookrackItems') === true) {
        bookrackItem['bookrackItems'].forEach(function (item) {
          searchAlbumId(item);
        });
      }
    }
  }

  async setAlbumDetailMap(key, value) {
    await this._albumDetailMap.set(key, value);
  }

  async getAlbumDetailMap(key) {
    let val = {};
    if (this._albumDetailMap.has(key)) {
      val = this._albumDetailMap.get(key);
      return val;
    }
    return val;
  }

  async determineTargetAlbum(photoInformation) {
    assert.ok((photoInformation["写真情報"] !== undefined),
      "bookrack-tree-operation.js: determineTargetAlbum : parameter '写真情報' is needed.");
    let photoInfo = photoInformation["写真情報"];
    let albumIds = this._albumIds;
    let constructionId = super.constructionId;
    for (let i = 0; i < albumIds.length; ++i) {
      let albumId = albumIds[i];
      let response = {};
      response = await this.getAlbumDetailMap(albumId);
      if (response.hasOwnProperty('albumDetail') === false) {
        response = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        if (response.hasOwnProperty('albumDetail') === false) {
          continue;
        }
        await this.setAlbumDetailMap(albumId, response);
      }
      let albumDetail = response["albumDetail"];
      let albumSettings = albumDetail["albumSettings"];
      let photoInfoTemplate = albumSettings['photoInfoTemplate'];
      if ((photoInfo['写真-大分類'] === photoInfoTemplate['largeClassification']) &&
        (photoInfo['写真区分'] === photoInfoTemplate['photoClassification']) &&
        (photoInfo['工種'] === photoInfoTemplate['constructionType']) &&
        (photoInfo['種別'] === photoInfoTemplate['middleClassification']) &&
        (photoInfo['細別'] === photoInfoTemplate['smallClassification'])) {
        return albumDetail['albumId'];
      }
    }

    let albumId = await super.getSystemAlbumNone();
    return albumId;
  }
}

class AlbumDistributorByFixClassification extends AlbumDistributor {
  constructor(constructionId) {
    super(constructionId);
    this._existAlbumInfo = [] // { boxName:null, albumName:null, albumId:null }
  }

  async create() {
    await super.initialize();
  }

  async setExistAlbumInfo(boxName, albumName, albumId) {
    this._existAlbumInfo.push({ boxName: boxName, albumName: albumName, albumId: albumId });
  }
  async getExistAlbumId(boxName, albumName) {

    for (let i = 0; i < this._existAlbumInfo.length; ++i) {
      let element = this._existAlbumInfo[i];
      if ((element.boxName == boxName) &&
        (element.albumName == albumName)) {
        return element.albumId;
      }
    }
    return null;
  }
  async getAlbumId(albumName) {
    let result = { bookrackId: null, albumId: null };
    let response = super.bookrackItems;
    for (let i = 0; i < response['bookrackItems'].length; ++i) {
      let bookrackItem = response['bookrackItems'][i];
      if (bookrackItem['bookrackItemType'] !== BOOKRACK_ITEM_TYPE_BOOKRACK) {
        continue;
      }
      if (bookrackItem['specialType'] !== SPECIAL_TYPE_SYSTEM) {
        continue;
      }
      if (result['bookrackId'] === null) {
        result['bookrackId'] = bookrackItem['bookrackItemId'];
      }
      if (bookrackItem.hasOwnProperty('bookrackItems')) {
        for (let j = 0; j < bookrackItem['bookrackItems'].length; ++j) {
          let item = bookrackItem['bookrackItems'][j];
          if ((item['bookrackItemType'] === BOOKRACK_ITEM_TYPE_ALBUM) &&
            (item['bookrackItemName'] === albumName)) {
            result['albumId'] = item['bookrackItemId'];
            return result;
          }
        }
      }

    }
    return result;
  }

  async getAlbumIdBoxAlbum(albumName, boxName) {
    let albumInfo = { bookrackId: null, boxId: null, albumId: null };
    let result = { boxId: null, albumId: null };
    let response = super.bookrackItems;

    for (let i = 0; i < response['bookrackItems'].length; ++i) {
      let bookrackItem = response['bookrackItems'][i];
      if (bookrackItem['bookrackItemType'] !== BOOKRACK_ITEM_TYPE_BOOKRACK) {
        continue;
      }
      if (bookrackItem['specialType'] !== SPECIAL_TYPE_SYSTEM) {
        continue;
      }
      albumInfo['bookrackId'] = bookrackItem['bookrackItemId'];
      if (!bookrackItem.hasOwnProperty('bookrackItems')) {
        continue;
      }
      result = searchAlbumInfo(bookrackItem['bookrackItems'], albumName, boxName);
      if (result['albumId'] !== null) {
        break;
      }
    }
    albumInfo['boxId'] = result['boxId'];
    albumInfo['albumId'] = result['albumId'];
    return albumInfo;

    function searchAlbumInfo(bookrackItems, albumName, boxName) {
      let result = { boxId: null, albumId: null };
      for (let i = 0; i < bookrackItems.length; ++i) {
        let bookrackItem = bookrackItems[i];
        assert.ok(bookrackItem.hasOwnProperty('bookrackItemType') === true);
        assert.ok(bookrackItem.hasOwnProperty('bookrackItemName') === true);
        if ((bookrackItem['bookrackItemType'] === BOOKRACK_ITEM_TYPE_BOX) &&
          (bookrackItem['bookrackItemName'] === boxName)) {
          if (result['boxId'] === null) {
            result['boxId'] = bookrackItem['bookrackItemId'];
          }
          //console.log("box:" + JSON.stringify(bookrackItem, null, 2));
          if (bookrackItem.hasOwnProperty('bookrackItems') === true) {
            for (let i = 0; i < bookrackItem['bookrackItems'].length; ++i) {
              let item = bookrackItem['bookrackItems'][i];

              assert.ok(item.hasOwnProperty('bookrackItemType') === true);
              assert.ok(item.hasOwnProperty('bookrackItemName') === true);
              assert.ok(item.hasOwnProperty('bookrackItemId') === true);
              assert.ok(item.hasOwnProperty('specialType') === true);

              if ((item['bookrackItemType'] === BOOKRACK_ITEM_TYPE_ALBUM) &&
                (item['bookrackItemName'] === albumName) &&
                (item['specialType'] !== SPECIAL_TYPE_SYSTEM)) {
                result['albumId'] = item['bookrackItemId'];
                return result;
              }
            }
          }
        }
      }
      return result;
    }
  }

  async determineTargetAlbum(boxName, albumName, boxColor) {
    let albumInfo = { bookrackId: null, boxId: null, albumId: null };

    let albumId = await this.getExistAlbumId(boxName, albumName);
    if (albumId !== null) {
      return albumId;
    }

    if (boxName === null) {
      let result = await this.getAlbumId(albumName);
      if (result['albumId'] !== null) {
        await this.setExistAlbumInfo(boxName, albumName, result['albumId']);
        return result['albumId']; // pattern 1
      }
      let albumParam = {
        "albumId": 0,   // 0 - create, otherwise - update
        "parentBookrackItemId": result['bookrackId'],
        "displayNumber": 1,
        "albumFrameTotalCount": DUMMY_ALBUM_FRAME_TOTAL_COUNT,
        "albumSettings": {
          "albumName": albumName
        }
      }

      let response = await bookrackAccessor.updateAlbum(this._constructionId, albumParam);
      if (response['albumId'] !== null) {
        await this.setExistAlbumInfo(boxName, albumName, response['albumId']);
      }
      return response['albumId'];
    }

    albumInfo = await this.getAlbumIdBoxAlbum(albumName, boxName);
    if (albumInfo['albumId'] !== null) {
      await this.setExistAlbumInfo(boxName, albumName, albumInfo['albumId']);
      return albumInfo['albumId'];
    }

    if (albumInfo['boxId'] === null) {
      let bookrackItem = {
        "bookrackItemId": 0, // 0=create, otherwise=update
        "parent": albumInfo['bookrackId'],
        "bookrackItemName": boxName,
        "bookrackItemType": BOOKRACK_ITEM_TYPE_BOX,
        "colorType": boxColor,
      };
      let constructionId = super.constructionId;
      let response = await bookrackAccessor.updateBookrackItem(constructionId, bookrackItem);
      if (response['bookrackItemId'] === null) { // fail?
        return null;
      }
      albumInfo['bookrackId'] = response['bookrackItemId'];
    }
    let albumParam = {
      "albumId": 0,   // 0 - create, otherwise - update
      "parentBookrackItemId": albumInfo['bookrackId'],
      "albumFrameTotalCount": DUMMY_ALBUM_FRAME_TOTAL_COUNT,
      "displayNumber": 1,
      "albumSettings": {
        "albumName": albumName
      }
    }
    let response = await bookrackAccessor.updateAlbum(this._constructionId, albumParam);
    if (response['albumId'] !== null) {
      await this.setExistAlbumInfo(boxName, albumName, response['albumId']);
    }
    return response['albumId'];
  }
}

class AlbumDistributorByConnectRule extends AlbumDistributor {
  constructor(constructionId) {
    super(constructionId);
    this._pattern = [];
    this._itemIdCache = [];
    this._photoTreePattern = null;
  }
  get pattern() { return this._pattern; }
  set pattern(_v) { this._pattern = _v; }

  async create() {
    await super.initialize();
  }

  async getPhotoTreePattern() {
    if (this._photoTreePattern === null) {
      let response = await bookrackAccessor.getConstructionSettings(super.constructionId);
      this._photoTreePattern = response['constructionSettings']['constructionPhoto']['photoTreePattern'];
    }
    return this._photoTreePattern;
  }

  async makePattern(photoInfo) {
    // アルバム名決定ルール：
    // this._pattern.push() の呼び出し回数が、N階層名になる。
    let photoTreePattern = await this.getPhotoTreePattern();
    switch (photoTreePattern) {
      case 0: // pattern A（最大４階層）
        //console.log("tree pattern A");
        if (photoInfo.hasOwnProperty('写真区分')) {
          this._pattern.push({ name: photoInfo['写真区分'], type: TYPE_DAIBUNRUI });
        }
        if (photoInfo.hasOwnProperty('工種')) {
          this._pattern.push({ name: photoInfo['工種'], type: TYPE_KUBUN });
        }
        if (photoInfo.hasOwnProperty('種別')) {
          this._pattern.push({ name: photoInfo['種別'], type: TYPE_KOUSYU });
        }
        if (photoInfo.hasOwnProperty('細別')) {
          this._pattern.push({ name: photoInfo['細別'], type: TYPE_SYUBETU });
        }
        break;
      case 1: // pattern B（最大４階層、区分を最下層に配置）
        //console.log("tree pattern B")
        if (photoInfo.hasOwnProperty('工種')) {
          this._pattern.push({ name: photoInfo['工種'], type: TYPE_DAIBUNRUI });
        }
        if (photoInfo.hasOwnProperty('種別')) {
          this._pattern.push({ name: photoInfo['種別'], type: TYPE_KUBUN });
        }
        if (photoInfo.hasOwnProperty('細別') && photoInfo.hasOwnProperty('写真区分')) {
          if (!(photoInfo['細別'] === null || photoInfo['細別'] === '')) {
            this._pattern.push({ name: photoInfo['細別'], type: TYPE_KOUSYU });
            this._pattern.push({ name: photoInfo['写真区分'], type: TYPE_SYUBETU });
          } else {
            this._pattern.push({ name: photoInfo['写真区分'], type: TYPE_KOUSYU });
          }
        }
        break;
      case 2: // pattern C（最大３階層、営繕工事用のパターン）
        //console.log("tree pattern C")
        if (photoInfo.hasOwnProperty('写真区分')) {
          this._pattern.push({ name: photoInfo['写真区分'], type: TYPE_DAIBUNRUI });
        }
        if (photoInfo.hasOwnProperty('工種')) {
          this._pattern.push({ name: photoInfo['工種'], type: TYPE_KUBUN });
        }
        if (photoInfo.hasOwnProperty('種別') && photoInfo['種別'] !== '') {
          //if (!(photoInfo['種別'] === null || photoInfo['種別'] === '')) {
          this._pattern.push({ name: photoInfo['種別'], type: TYPE_KOUSYU });
        }
        break;
      case 3: // pattern D（最大５階層）
        //console.log("tree pattern D")
        if (photoInfo.hasOwnProperty('写真-大分類')) {
          this._pattern.push({ name: photoInfo['写真-大分類'], type: TYPE_DAIBUNRUI });
        }
        if (photoInfo.hasOwnProperty('写真区分')) {
          this._pattern.push({ name: photoInfo['写真区分'], type: TYPE_KUBUN });
        }
        if (photoInfo.hasOwnProperty('工種')) {
          this._pattern.push({ name: photoInfo['工種'], type: TYPE_KOUSYU });
        }
        if (photoInfo.hasOwnProperty('種別')) {
          if (!(photoInfo['種別'] === null || photoInfo['種別'] === '')) {
            this._pattern.push({ name: photoInfo['種別'], type: TYPE_SYUBETU });
          }
        }
        if (photoInfo.hasOwnProperty('細別')) {
          if (!(photoInfo['細別'] === null || photoInfo['細別'] === '')) {
            this._pattern.push({ name: photoInfo['細別'], type: TYPE_SAIBETU });
          }
        }
        break;
      default:
        //console.log("unknown PhotoTreePattern:" + photoTreePattern);
        this._pattern.push({ name: null, type: null });
        break;
    }
  }

  async getAlbumInfo(classification) {
    let albumInfo = {};
    switch (classification.length) {
      case 5:
        albumInfo = {
          '本棚名': classification[0].name,
          '仕切り名': classification[1].name,
          'BOX名': classification[2].name,
          'アルバム名': classification[3].name + "-" + classification[4].name
        };
        return albumInfo;
      case 4:
        albumInfo = {
          '本棚名': classification[0].name,
          '仕切り名': classification[1].name,
          'BOX名': classification[2].name,
          'アルバム名': classification[3].name,
        };
        return albumInfo;
      case 3:
        albumInfo = {
          '本棚名': classification[0].name,
          '仕切り名': classification[1].name,
          'BOX名': null,
          'アルバム名': classification[2].name,
        };
        return albumInfo;
      case 2:
        albumInfo = {
          '本棚名': classification[0].name,
          '仕切り名': null,
          'BOX名': null,
          'アルバム名': classification[1].name,
        };
        return albumInfo;
      case 1:
        let systemBookrackIds = await super.getSystemBookrack();
        //console.log("classification:" + JSON.stringify(classification, null, 2));
        albumInfo = {
          '本棚名': systemBookrackIds['name'],
          '仕切り名': null,
          'BOX名': null,
          'アルバム名': classification[0],
        };
        return albumInfo;
      default:
        //console.log("error: classification.lenth:" + classification.length);
        albumInfo = {
          '本棚名': null,
          '仕切り名': null,
          'BOX名': null,
          'アルバム名': null
        };
        return albumInfo;
    }
  }

  async determineTargetAlbum(photoInformation, boxColor) {
    assert.ok(photoInformation["写真情報"] !== undefined);
    this.pattern = [];
    await this.makePattern(photoInformation["写真情報"]);
    let constructionId = super.constructionId;
    let response = await photoInfomationTree.getTreeInfo(constructionId, 1);
    let classification = [];
    let albumId = null;
    let root = await this.getRootChildren(response);

    if ((root.children === null) &&
      (root.name === null)) {
      return null;
    }

    // 写真整理情報ツリーに一致構成があるか確認する 
    //  this.searchChildItem(root.children, 0, classification);
    //  return true:一致する構成がある。
    //  return false:一致する構成がない
    //
    // 上記関数の戻り値は参照しない。
    //
    // 一致する構成があっても無くても
    // getBookrackItem()上のツリー構成と一致するか確認し、無ければ作成するため。
    // 
    let rc = await this.searchChildItem(root.children, 0, classification);
    //console.log("classification:" + JSON.stringify(classification, null, 2));
    //if (rc) {
    let albumInfo = await this.getAlbumInfo(this._pattern);
    if (albumInfo['アルバム名'] === undefined || albumInfo['アルバム名'] === null) {
      return null;
    }
    if (albumInfo['アルバム名']['name'] === null ||
      albumInfo['アルバム名']['name'] === '-') {
      return null;
    }
    //console.log("albumInfo:"+JSON.stringify(albumInfo, null, 2));
    let top = super.bookrackItems;

    if (!top.hasOwnProperty('bookrackItems')) {
      return null;
    }

    let obj = {};
    obj = await this.getItemId(BOOKRACK_ITEM_TYPE_ALBUM, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名'], albumInfo['アルバム名']]);
    if (obj['itemId'] !== null) {
      return obj['itemId'];
    }

    let upperId = "";
    if (albumInfo['本棚名'] !== null) {
      //console.log("albumInfo['本棚名']:"+albumInfo['本棚名']);
      let wkObj = await this.getItemId(BOOKRACK_ITEM_TYPE_BOOKRACK, [albumInfo['本棚名']]);
      if (wkObj['itemId'] === null) {
        obj = await this.searchBookrackItems(top.bookrackItems, BOOKRACK_ITEM_TYPE_BOOKRACK, albumInfo['本棚名']);
        if (obj['itemId'] !== null) {
          await this.setItemId(BOOKRACK_ITEM_TYPE_BOOKRACK, [albumInfo['本棚名']], obj['itemId'], obj['items']);
        }
      }
      if (obj['itemId'] === null) {
        let bookrackItem = {
          "bookrackItemId": 0, // 0=create, otherwise=update
          // "parent": upperId,
          "bookrackItemName": albumInfo['本棚名'],
          "bookrackItemType": BOOKRACK_ITEM_TYPE_BOOKRACK,
          "colorType": boxColor,
        };
        let response = await bookrackAccessor.updateBookrackItem(constructionId, bookrackItem);
        if (response['bookrackItemId'] === null) {
          return null;
        }
        await this.setItemId(BOOKRACK_ITEM_TYPE_BOOKRACK, [albumInfo['本棚名']], response['bookrackItemId'], []);
        upperId = response['bookrackItemId'];
      } else {
        upperId = obj['itemId'];
      }
    }

    if (albumInfo['仕切り名'] !== null) {
      let wkObj = await this.getItemId(BOOKRACK_ITEM_TYPE_SHIKIRI, [albumInfo['本棚名'], albumInfo['仕切り名']]);
      if (wkObj['itemId'] === null) {
        obj = await this.searchBookrackItems(obj['items'], BOOKRACK_ITEM_TYPE_SHIKIRI, albumInfo['仕切り名']);
        if (obj['itemId'] !== null) {
          await this.setItemId(BOOKRACK_ITEM_TYPE_SHIKIRI, [albumInfo['本棚名'], albumInfo['仕切り名']], obj['itemId'], obj['items']);
        } else {
          obj['itemId'] = wkObj['itemId'];
        }
      }
      if (obj['itemId'] === null) {
        let bookrackItem = {
          "bookrackItemId": 0, // 0=create, otherwise=update
          "parent": upperId,
          "bookrackItemName": albumInfo['仕切り名'],
          "bookrackItemType": BOOKRACK_ITEM_TYPE_SHIKIRI,
          "colorType": boxColor,
        };
        let response = await bookrackAccessor.updateBookrackItem(constructionId, bookrackItem);
        if (response['bookrackItemId'] === null) {
          return null;
        }
        await this.setItemId(BOOKRACK_ITEM_TYPE_SHIKIRI, [albumInfo['本棚名'], albumInfo['仕切り名']], response['bookrackItemId'], []);
        upperId = response['bookrackItemId'];
      } else {
        upperId = obj['itemId'];
      }
    }

    if (albumInfo['BOX名'] !== null) {
      let wkObj = await this.getItemId(BOOKRACK_ITEM_TYPE_BOX, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名']]);
      if (wkObj['itemId'] === null) {
        obj = await this.searchBookrackItems(obj['items'], BOOKRACK_ITEM_TYPE_BOX, albumInfo['BOX名']);
        if (obj['itemId'] !== null) {
          await this.setItemId(BOOKRACK_ITEM_TYPE_BOX, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名']], obj['itemId'], obj['items']);
        } else {
          obj['itemId'] = wkObj['itemId'];
        }
      }
      if (obj['itemId'] === null) {
        let bookrackItem = {
          "bookrackItemId": 0, // 0=create, otherwise=update
          "parent": upperId,
          "bookrackItemName": albumInfo['BOX名'],
          "bookrackItemType": BOOKRACK_ITEM_TYPE_BOX,
          "colorType": boxColor,
        };
        let response = await bookrackAccessor.updateBookrackItem(constructionId, bookrackItem);
        if (response['bookrackItemId'] === null) {
          return null;
        }
        await this.setItemId(BOOKRACK_ITEM_TYPE_BOX, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名']], response['bookrackItemId'], []);
        upperId = response['bookrackItemId'];
      } else {
        upperId = obj['itemId'];
      }
    }

    if (albumInfo['アルバム名'] !== null) {
      let wkObj = await this.getItemId(BOOKRACK_ITEM_TYPE_ALBUM, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名'], albumInfo['アルバム名']]);
      if (wkObj['itemId'] === null) {
        obj = await this.searchBookrackItems(obj['items'], BOOKRACK_ITEM_TYPE_ALBUM, albumInfo['アルバム名']);
        if (obj['itemId'] !== null) {
          await this.setItemId(BOOKRACK_ITEM_TYPE_ALBUM, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名'], albumInfo['アルバム名']], obj['itemId'], obj['items']);
        } else {
          obj['itemId'] = wkObj['itemId'];
        }
      }

      if (obj['itemId'] === null) {
        let albumParam = {
          "albumId": 0,   // 0 - create, otherwise - update
          "parentBookrackItemId": upperId,
          "displayNumber": 1,
          "albumFrameTotalCount": DUMMY_ALBUM_FRAME_TOTAL_COUNT,
          "albumSettings": {
            "albumName": albumInfo['アルバム名']
          }
        }
        // console.log("JSON albumParam:" + JSON.stringify(albumParam, null, 2));
        try {
          response = await bookrackAccessor.updateAlbum(this._constructionId, albumParam);
        } catch (e) {
          console.error("exception: updateAlbum() :" + e);
          return null;
        }
        albumId = response['albumId'];
        this.setItemId(BOOKRACK_ITEM_TYPE_ALBUM, [albumInfo['本棚名'], albumInfo['仕切り名'], albumInfo['BOX名'], albumInfo['アルバム名']], albumId, []);
      } else {
        albumId = obj['itemId'];
      }
    }
    //}
    return albumId;
  }
  async setItemId(type, names, itemId, items) {
    this._itemIdCache.push({ type: type, names: names, itemId: itemId, items: items });
  }
  async getItemId(type, names) {
    for (let i = 0; i < this._itemIdCache.length; ++i) {
      let data = this._itemIdCache[i];
      if (data['type'] !== type) {
        continue;
      }
      if (names.length !== data['names'].length) {
        continue;
      }
      let found = true;
      for (let j = 0; j < data['names'].length; ++j) {
        let name = data['names'][j];
        if (names[j] === name) {
          continue;
        } else {
          found = false;
          break;
        }
      }
      if (found === true) {
        return { itemId: data['itemId'], items: data['items'] };
      }
    }
    return { itemId: null, items: [] };
  }
  async searchBookrackItemId(items, type, name) {
    for (let i = 0; i < items.length; ++i) {
      let obj = items[i];
      if ((obj['bookrackItemType'] === type) &&
        (obj['bookrackItemName'] === name) &&
        (obj['bookrackItemType'] !== SPECIAL_TYPE_SYSTEM)) {
        return obj['bookrackItemId'];
      }
    }
    return null;
  }
  async searchBookrackItems(items, type, name) {
    for (let i = 0; i < items.length; ++i) {
      let obj = items[i];
      if (type === BOOKRACK_ITEM_TYPE_BOOKRACK) {
        if (obj['specialType'] === SPECIAL_TYPE_SYSTEM) {
          continue; //システム本棚は、読み飛ばす。
        }
      }
      if ((obj['bookrackItemType'] === type) &&
        (obj['bookrackItemName'] === name)) {
        if (obj.hasOwnProperty('bookrackItems')) {
          return { itemId: obj['bookrackItemId'], items: obj['bookrackItems'] };
        } else {
          return { itemId: obj['bookrackItemId'], items: [] };
        }
      }
    }
    //if (obj.hasOwnProperty('bookrackItems')) {
    //  return await this.searchBookrackItems(obj['bookrackItems'], type, name);
    //}
    return { itemId: null, items: [] };
  }
  async getRootChildren(childItem) {
    if (childItem['type'] === TYPE_ROOT) {
      if (childItem.hasOwnProperty('children')) {
        return ({ children: childItem['children'], name: childItem['name'] });
      }
      return ({ children: null, name: null });
    }
    return ({ children: null, name: null });
  }
  async searchChildItem(childItems, num, array) {
    for (let i = 0; i < childItems.length; ++i) {
      let obj = childItems[i];
      if (num >= this.pattern.length) {
        break;
      }
      if (obj['type'] !== this.pattern[num].type) {
        continue;
      }
      //console.log("compare id:"+obj['type']+"(obj['name'] : this.pattern[num].name) ="+"("+obj['name']+" : "+ this.pattern[num].name+")")
      if (obj['name'] !== this.pattern[num].name) {
        continue;
      }
      array.push({ name: obj['name'], id: obj['id'] });
      num++;
      if (!obj.hasOwnProperty('children')) {
        // 一致
        return true;
      } else {
        //console.log("nest num:"+num);
        return await this.searchChildItem(obj['children'], num, array);
      }
    }
    return false;
  }
}

module.exports = {
  AlbumDistributorByJacicXmp,
  AlbumDistributorByFixClassification,
  AlbumDistributorByConnectRule
};