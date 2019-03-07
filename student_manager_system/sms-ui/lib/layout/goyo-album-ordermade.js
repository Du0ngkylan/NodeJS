'use strict';

// Node.js modules.
const https = require('https');
const fs = require('fs');
const util = require('util');
const path = require('path');

// 3rd-party modules.
const fse = require('fs-extra');
const AdmZip = require('adm-zip');

// Goyo modules.
const goyoAppFolder = require('../goyo-appfolder');
const goyoAppDefaults = require('../goyo-app-defaults');
const albumTemplateApi = require('../goyo-web-api');
// const bookrackAccessor = require('sms-accessor');
// const converter = require('goyo-album-template-converter');
const licenseManager = require('../license/goyo-license-manager');
const logger = require('../goyo-log')('goyo-album-ordermade');

const STANDARD_TEMPLATE_COUNT = 18;
const SUCCESS = 200;
const TEMPALTE_DIR_REGEX = /(\d+)-(\d+)$/;

let stat = util.promisify(fs.stat);
const readFiles = util.promisify(fs.readdir);

module.exports = {
  async getAlbumTemplates() {
    try {
      let pathAppFolder = goyoAppFolder.getAppFolder();
      let pathOrderMade = path.join(pathAppFolder, "ordermade");        
      if (!(await stat(pathOrderMade)).isDirectory()) {      
        logger.error('Do not exist the path of \'ordermade\'');
        return [];
      }
      
      if (!(await stat(pathOrderMade)).isDirectory()) {
        return [];
      }

      // get all directories in 'ordermade' folder.
      return (await readFiles(pathOrderMade))
        .map(folder => {
          const [_, id, revision] = folder.match(TEMPALTE_DIR_REGEX);
          return [folder, id, revision]
        })
        //todo fix default template check
        .filter(([folder, id, revision]) => {
          return id != null && revision != null && Number(id) > STANDARD_TEMPLATE_COUNT
        })
        .map(([folder, id, revision]) => {
          return [folder, id, revision, path.join(pathOrderMade, folder)]
        })
        .filter(([folder, id, revision, dir]) => (fs.statSync(dir)).isDirectory())
        .map(([folder, id, revision, dir]) => {
          return {
            id: Number(id),
            type: 'ordermade',
            name: folder,
            revision: Number(revision),
            path: dir
          }
        })
        .sort((a,b) => a.id - b.id);
    } catch (err) {
      logger.error(err.message, err);
    }    
  },

  async getAlbumTemplate(id) {
    let albumTemplates = this.getLatestRevisionAlbumTemplate(await this.getAlbumTemplates());
    if (!Array.isArray(albumTemplates) || !albumTemplates.length) {
      return null;
    }

    let albumTemplate = albumTemplates.find(album => {
      return album.id === id;
    });

    if (albumTemplate === undefined) {
      return null;
    }
    
    return albumTemplate;
  },
  
  async downloadTemplates() {
    if (!await albumTemplateApi.webApiIsAccessible()) {
      logger.info('skip downloading album template.');
      return null;
    }

    let device = licenseManager.deviceId;
    let version  = goyoAppDefaults.VERSION;

    try {
      let response = await albumTemplateApi.getAlbumTemplateList(device, version);      

      if (!response.hasOwnProperty('code') || response.code !== SUCCESS) {
        logger.info('could not get album template list.');
        return null;
      }

      let pathOrderMade = path.join(goyoAppFolder.getAppFolder(), "ordermade");
      await fse.ensureDir(pathOrderMade);

      let downloadedAlbumTemplateList = await this.getAlbumTemplates();
      let albumTemplateList = response.tmpl_list;
      let templateFolder = "";
      let updatedInfors = [];
      let addedInfors = [];

      const downloadTemplateList = response.tmpl_list
        .filter(albumTemplate => Number(albumTemplate.albumTemplateid) > STANDARD_TEMPLATE_COUNT)
        .filter(albumTemplate => {
          return downloadedAlbumTemplateList.find(tmpl => tmpl.id == Number(albumTemplate.albumTemplateid) && tmpl.revision >= Number(albumTemplate.revision)) == null
        })

      for (let albumTemplate of downloadTemplateList) {
        // make the album template folder.
        templateFolder = path.join(pathOrderMade, `${albumTemplate.albumTemplateid}-${albumTemplate.revision}`);          
        await fse.ensureDir(templateFolder);

        try {
          await download(albumTemplate.downloadurl, path.join(templateFolder,'albumTemplate.zip'));
          await download(albumTemplate.thumburl, path.join(templateFolder,'preview.png'));

          unzip(path.join(templateFolder,'albumTemplate.zip'), templateFolder);
          convertAlbumTemplate(templateFolder, 'ordermade');

          // check whether the albumTemplate is updated or not. 
          let isAddTemplate = downloadedAlbumTemplateList.find(obj => obj.id === albumTemplate.albumTemplateid) == null;

          if (isAddTemplate) {
            addedInfors.push({
              id: albumTemplate.albumTemplateid,
              type: 'ordermade', 
              name: `${albumTemplate.albumTemplateid}`, revision: albumTemplate.revision,
              path: templateFolder
            });
          } else {
            updatedInfors.push({
              id: albumTemplate.albumTemplateid,
              type: 'ordermade', 
              name: `${albumTemplate.albumTemplateid}`, revision: albumTemplate.revision,
              path: templateFolder
            });
          }

          // cleanup.
          await fse.remove(path.join(templateFolder,'albumTemplate.zip'));
        } catch(e) {
          if (!await fse.exists(path.join(templateFolder,'albumTemplateG.json'))) {
            await fse.remove(path.join(templateFolder));
          }
          logger.error(`failed to get album tamplate ${albumTemplate}`, e);
        }
      }

      return {
        updated: updatedInfors, 
        added: addedInfors
      };
    } catch (err) {
      logger.error(err.message, err);
      return null;
    }
  },

  getLatestRevisionAlbumTemplate(albumTemplates) {
    if (!Array.isArray(albumTemplates) || !albumTemplates.length) {
      return [];
    }

    albumTemplates.sort((obj1, obj2) => {
      let comparison = 0;
      if (obj1.id > obj2.id) {
        comparison = 1; 
      } else if (obj1.id < obj2.id) {
        comparison = -1;
      }
      return comparison;
    });
  
    for (let i = 0; i < albumTemplates.length - 1; ++i) {
      if (albumTemplates[i] !== undefined && albumTemplates[i].id === albumTemplates[i + 1].id) {
        if (albumTemplates[i].revision < albumTemplates[i + 1].revision) {
          delete albumTemplates[i];
        } else {
          delete albumTemplates[i + 1];
        }
      }
    }
  
    return albumTemplates.filter(albumTemplate => {
      return albumTemplate !== undefined;
    });
  },
};

function download(url, outPath) {
  return new Promise((resolve,reject) => {
    let file = fs.createWriteStream(outPath);
    let request = https.get(url, response => {
      if (response.statusCode!==200) {
        file.destroy();
        reject(new Error(`could not get ${url} with status code ${response.statusCode}`));
        return;
      }
      response.pipe(file, true);
      response.on('error', (err) => reject(err));
      response.on('end', () => {
        resolve(true);
      });
    });
    request.on('error', (err) => reject(err));
  });
}

function unzip(file, folder) {
  try {
    let zip = new AdmZip(file);
    zip.extractAllTo(folder, true);
  } catch(e) {
    throw new Error(`${e} for file ${file}`);
  }
}

// Convert albumTemplate.json to albumTemplateG.json - It can be able to delete.
async function doConvert(srcPath, destPath, type) {
  try {
    if (! await fse.exists(srcPath)) { return; }

    // let source = JSON.parse(await fse.readFile(srcPath));
    // let converted = converter.convert(source, type);

    // let convertedJson = JSON.stringify(converted, null, 2);
    // await fse.writeFile(destPath, convertedJson);

    return true;
  } catch(e) {
    logger.error(`Failed to convert file ${srcPath}`, e);
    return false;
  } finally {
  }
}

async function convertAlbumTemplate(dir, type) {
  let srcPath = path.join(dir, 'albumtemplate.json');
  let destPath = path.join(dir, 'albumtemplateG.json');
  await doConvert(srcPath, destPath, type);
}
