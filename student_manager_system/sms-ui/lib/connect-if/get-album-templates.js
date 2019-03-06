'use strict';

const fs = require('fs');

// Goyo modules.
const goyoAlbumLayout = require('../layout/goyo-album-layout');
const logger = require('../goyo-log')('get-album-templates');

const accessor = {
  async getAlbumTemplates () {
    let templates = [];
    let types = [
      goyoAlbumLayout.LAYOUT_TYPE_STANDARD, 
      goyoAlbumLayout.LAYOUT_TYPE_OTHER,
      goyoAlbumLayout.LAYOUT_TYPE_ORDERMADE,
    ];
    try {
      for (let type of types) {
        const result = await goyoAlbumLayout.getLayoutInfos(type);
        for (let r of result) {
          let path = r.path + '\\albumtemplate.json';
          if (fs.existsSync(path)) {
            var templateInfo = JSON.parse(fs.readFileSync(path, 'utf8'), 'utf8');
            r.revision = templateInfo.revision;
            r.matchKokubanTypes = templateInfo.matchKokubanTypes;  
          } else {
            r.revision = 0;
          }
        }
        let array = result.map((template) => ({
          "albumTemplateid": template.id,
          "albumTemplateType": type,
          "revision": template.revision,
          "albumName": template.name,
          "matchKokubanTypes": template.matchKokubanType ? template.matchKokubanType : [],
        }));
        templates = templates.concat(array);
      }
      return templates;
    } catch (ex) {
      logger.error("Failed to GetAlbumTemplates", ex);
      throw ex;
    }
  },
};

module.exports = accessor;