'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 3rd-party modules.
const fse = require('fs-extra');

// goyo modules.
const goyoResources = require('goyo-resources');
const goyoOrdermade = require('./goyo-album-ordermade');
const logger = require('../goyo-log')('goyo-album-layout');
const goyoAppFolder = require('../goyo-appfolder');
const lockFactory= require('../lock-manager/goyo-lock-manager');



// アルバムのレイアウト選択UIから使いやすいように、
// 標準、オーダーメイド、その他のテンプレートパスを取得手順を共通化するためのモジュール
// メソッド
//   IDからテンプレート情報を取得する
//   各typeのテンプレート情報リストを取得する
//   テンプレートフォルダパスからIDを取得する
// テンプレート情報
//   type
//   ID
//   テンプレートフォルダパス
//   サムネイルパス

module.exports = {
  LAYOUT_TYPE_STANDARD: goyoResources.ALBUM_TEMPLATE_TYPE_STANDARD,
  LAYOUT_TYPE_OTHER: goyoResources.ALBUM_TEMPLATE_TYPE_OTHER,
  LAYOUT_TYPE_ORDERMADE: 'ordermade',

  async getLayoutInfos(type) {
    if (type === this.LAYOUT_TYPE_ORDERMADE) {
      let templates = goyoOrdermade.getLatestRevisionAlbumTemplate(await goyoOrdermade.getAlbumTemplates());
      if (!Array.isArray(templates) || !templates.length) {
        return [];
      }

      let promises = templates.map(t => {
        return makeLayoutInfo(t.path, t.type, t.id);
      });
      return await Promise.all(promises);
    } else {
      let templates = goyoResources.getAlbumTemplates(type);
      let promises = templates.map(t => {
        return makeLayoutInfo(t.path, t.type, t.id);
      });
      return await Promise.all(promises);
    }
  },

  async getLayoutInfo(typeOrPath, id=null) {
    let templatePath;

    if (id == null) {
      return await makeLayoutInfo(typeOrPath);
    } else if (typeof typeOrPath === 'string' && typeof id === 'number') {
      templatePath = await getTemplatePath(typeOrPath, id);
      if (templatePath) {
        return await makeLayoutInfo(templatePath, typeOrPath, id);
      }
    } else {
      assert(false);
    }

    return null;
  },

  async updateLayouts(type) {
    // TODO: 
    //return new Promise(r => setTimeout(()=>r(true), 5000));

    let layoutInfos = await this.getLayoutInfos(type);

    const bookrackAccessor = require('sms-accessor');
    let { constructions } = await bookrackAccessor.getConstructions();

    for (let construction of constructions) {
      logger.debug(`update construction: ${construction.constructionId}`)
      await updateAlbumsIn(construction.constructionId);
    }

    async function updateAlbumsIn(constructionId) {
      let albumDetails = await getAllAlbumDetails(constructionId);
      for (let albumDetail of albumDetails) {
        let currentLayout = await makeLayoutInfo(albumDetail.layout.albumTemplate);

        let newLayout = layoutInfos.find(li => {
          return li.type===currentLayout.type && li.id===currentLayout.id;
        });
        if (newLayout && (await newLayout.template).revision > (await currentLayout.template).revision) {
          await updateAlbum(constructionId, albumDetail, newLayout);
        } else {
        }
      }
    }

    async function updateAlbum(constructionId, albumDetail, newLayout) {
      let lockManager;
      let locked;
      let name = `${albumDetail.albumSettings.albumName}:${constructionId}-${albumDetail.albumId}`;
      try {
        lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
        locked = await lockManager.lockAlbum(albumDetail.albumId, true);
        if (locked) {
          const goyoAlbumOperation = require('../goyo-album-operation');
          await goyoAlbumOperation.updateAlbumSetting(constructionId, albumDetail.albumId, albumDetail.albumSettings, newLayout.path);
          logger.info(`layout of album(${name}) is updated into rev.${(await newLayout.template).revision}`);
        } else {
          logger.info(`layout of album(${name}) could not be updated because of lock failure.`);
        }
      } catch(e) {
        logger.error(`updating layout of album(${name}) failed.`, e);
      } finally {
        if (lockManager != null && locked)
          await lockManager.lockAlbum(albumDetail.albumId, false);
      }
    }

    async function getAllAlbumDetails(constructionId) {
      let { bookrackItems } = await bookrackAccessor.getBookrackItems(constructionId);
      let albumIds = getAlbumIds(bookrackItems);

      let promises = albumIds.map(id =>
        bookrackAccessor.getAlbumDetail(constructionId, id).then(r => r.albumDetail));

      return Promise.all(promises);
    }

    function getAlbumIds(items) {
      let ids = [];
      for (let item of items) {
        if (item.bookrackItemType===3) {
          ids.push(item.bookrackItemId);
        }
        if (item.bookrackItems instanceof Array) {
          let _ids = getAlbumIds(item.bookrackItems);
          ids = ids.concat(_ids);
        }
      }
      return ids;
    }
    
  },

  async checkLayoutUpdate(bookrackAccessor, constructionId, albumId, albumInformation) {
    let layoutInfo = await this.getLayoutInfo(albumInformation.albumDetail.layout.albumTemplate);
    if (layoutInfo.type !== 'ordermade') return albumInformation;
  
    try {
      let latestLayout = await this.getLayoutInfo('ordermade', layoutInfo.id);
      if (!latestLayout) return albumInformation;
  
      let currentRev = (await layoutInfo.template).revision;
      let latestRev = (await latestLayout.template).revision;
      if (currentRev < latestRev) {
        albumInformation.albumDetail.layout.albumTemplate = latestLayout.path;
        await bookrackAccessor.updateAlbum(constructionId, albumInformation.albumDetail);
        albumInformation = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        logger.debug(`checkLayoutUpdate: update album layout id:${layoutInfo.id} rev:${currentRev} => ${latestRev}`);
      }
    } catch(e) {
      logger.error('checkLayoutUpdate', e);
    }
  
    return albumInformation;
  }
  
};

// Internal functions

async function getTemplatePath(type, id) {
  let templatePath;
  if (type === "standard") {
    templatePath = (await goyoResources.getAlbumTemplate(type, id)).path;
    if (templatePath) {
      return templatePath;
    }
  } else if (type === "ordermade") {
    templatePath = (await goyoOrdermade.getAlbumTemplate(id)).path;
    if (templatePath) {
      return templatePath;
    }
  }
}

async function makeLayoutInfo(templatePath, type=null, id=null) {
  let template = null;

  if (type==null || id==null) {
    try {
      let templateFile = path.join(templatePath, 'albumtemplateG.json');
      template = JSON.parse(await fse.readFile(templateFile));

      id = template.albumTemplateid;
      type = template.albumTemplateType;
    } catch(e) {
      return null;
    }
  }

  return {
    _template: template, // this is a private property.
    type,
    id,
    name: String(id),
    path: templatePath,
    thumbnail: path.join(templatePath, 'preview.png'),
    get template() {
      if (this._template) {
        return Promise.resolve(this._template);
      }

      return fse.readFile(path.join(this.path, 'albumtemplateG.json'))
        .then(r => this._template = JSON.parse(r))
        .catch(e => {
          logger.error(e);
          return Promise.reject(Error('Invalid template'));
        });
    },
    async getDefaultText(index) {
      let template = await this.template;
      let count = template.leftPageBlockCount + template.rightPageBlockCount;
      index = index % count;
      let defaultText = template.blocks[index].defaultText;
      if (defaultText && defaultText.hasOwnProperty('key') && defaultText.hasOwnProperty('textFormat')) {
        return defaultText;
      } else {
        return null;
      }
    },
    async detectKokubanMatching(textFrames) {
      let template = await this.template;
      if (template.matchKokubanTypes.length===0) {
        return 'none';
      } else if (!textFrames.hasOwnProperty('kokuban.template.typeid')) {
        return 'unmatch';
      } else if (template.matchKokubanTypes.some(t => String(t)===textFrames['kokuban.template.typeid'].fieldValue)) {
        return 'match';
      } else {
        return 'unmatch';
      }
    },
  };
}
