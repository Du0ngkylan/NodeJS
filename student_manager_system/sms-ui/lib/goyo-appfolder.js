
// Node.js modules.
const path = require('path');

// Electron modules.
const { app } = require('electron');

// 3rd-parth modules.
const fse = require('fs-extra');

// Goyo modules.
const { goyoCopy } = require('./goyo-utils');

const GOYO18_GASUKE_FOLDER = path.join(
  app.getPath('appData'),
  'NEC Solution Innovators',
  'GASUKE',
);

const GOYO18_X64_APP_FOLDER = path.join(
  app.getPath('appData'),
  'NEC Solution Innovators',
  'GASUKE',
  'C00PROGRA~20GOYO18',
);

const GOYO18_X86_APP_FOLDER = path.join(
  app.getPath('appData'),
  'NEC Solution Innovators',
  'GASUKE',
  'C00PROGRA~10GOYO18',
);

const GOYO20_APP_FOLDER = path.join(
  app.getPath('appData'),
  'Lecre',
  'GOYO2020',
);

const INITIAL_BOOKRACK = path.join(
  __dirname,
  '..',
  'resources',
  'initialbookrack'
);

const BACK_COVER = path.join(
  __dirname,
  '..',
  'resources',
  'COVER',
  'BACK'
);

const SPINE_COVER = path.join(
  __dirname,
  '..',
  'resources',
  'COVER',
  'SPINE'
);

const FRONT_COVER = path.join(
  __dirname,
  '..',
  'resources',
  'COVER',
  'FRONT'
);

const MAX_APP_FOLDER_PATH_LENGTH = 120;
const MAX_CONSTRUCTION_FOLDER_PATH_LENGTH = 140;

module.exports = {
  getAppFolder: function() {
    return GOYO20_APP_FOLDER;
  },
  getAppDataFolder:function(){
    const goyoProgramSettings = require('./goyo-program-settings');
    if(!goyoProgramSettings.isInitialize()){
      return null;
    }
    if(goyoProgramSettings.dataManagement.rootFolder){
      return goyoProgramSettings.dataManagement.rootFolder;
    }else{
      return GOYO20_APP_FOLDER;
    }
  },
  asyncGetAppDataFolder:async function(){
    const goyoProgramSettings = require('./goyo-program-settings');
    if(!goyoProgramSettings.isInitialize()){
      await goyoProgramSettings.initialize();
    }
    if(goyoProgramSettings.dataManagement.rootFolder){
      return goyoProgramSettings.dataManagement.rootFolder;
    }else{
      return GOYO20_APP_FOLDER;
    }
  },
  goyo18GasukeFolder:async function(){
    if (await fse.pathExists(GOYO18_GASUKE_FOLDER)){
      return GOYO18_GASUKE_FOLDER;
    }
    return undefined;
  },
  goyo18GasukeFolderList:async function(){
    if (await fse.pathExists(GOYO18_GASUKE_FOLDER)){
      const isDirectory = source => fse.lstatSync(source).isDirectory()
      const getDirectories = source =>
        fse.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)
      const getNameList = list => {
        let nameList =[];
        for(let itr of list){
          let lastSlash = itr.lastIndexOf('\\');
          if(lastSlash === -1){
            lastSlash = itr.lastIndexOf('/');
          }
          nameList.push(itr.substr(++lastSlash));
        }
        return nameList;
      }
      const pathList = getDirectories(GOYO18_GASUKE_FOLDER);
      const nameList = getNameList(pathList);
      return {pathList,nameList};
    }
    return undefined;
  },
  getGoyo18AppFolder:async function(){
    if (await fse.pathExists(GOYO18_X64_APP_FOLDER)){
      return GOYO18_X64_APP_FOLDER;
    }
    if (await fse.pathExists(GOYO18_X86_APP_FOLDER)){
      return GOYO18_X86_APP_FOLDER;
    }
    return undefined;
  },
  getBackCover: function() {
    return BACK_COVER;
  },
  getFrontCover: function() {
    return FRONT_COVER;
  },
  getSpineCover: function() {
    return SPINE_COVER;
  },
  isExsitsApplicationFolder:async function(){
    return await fse.pathExists(GOYO20_APP_FOLDER);
  },
  checkAndCreateApplicationFolder: async function(_isExistsApplicationFolder = false) {
    if(!_isExistsApplicationFolder){
      await goyoCopy(INITIAL_BOOKRACK, GOYO20_APP_FOLDER);
    }
    return GOYO20_APP_FOLDER;
  },

  checkUsableAsExternalDataFolder: async function(folderPath) {
    let desktop = app.getPath('desktop');
    folderPath = path.resolve(folderPath);

    if (/^\w:\\$/.test(folderPath)) {
      return { usable: false, reason: 'root' };
    }
    
    if (folderPath.startsWith(desktop)) {
      return { usable: false, reason: 'desktop' };
    }
    
    if (folderPath.startsWith(app.getPath('appData'))) {
      return { usable: false, reason: 'appdata' };
    }
    
    try {
      if ((await fse.readdir(folderPath)).length > 0) {
        return { usable: false, reason: 'not empty' };
      }
    } catch(e) {
      return { usable: false, reason: 'permission' };
    }
    
    try {
      await fse.writeFile(path.join(folderPath,'test'), '.....');
      await fse.unlink(path.join(folderPath,'test'));
    } catch(e) {
      return { usable: false, reason: 'permission' };
    }

    return { usable: true };
  },
  checkUsableAppFolderPathLength: function(folderPath) {
    folderPath = path.resolve(folderPath);
    if (MAX_APP_FOLDER_PATH_LENGTH < folderPath.length) {
      return { usable: false, maxLength: MAX_APP_FOLDER_PATH_LENGTH };
    }
    return { usable: true, maxLength: MAX_APP_FOLDER_PATH_LENGTH };
  },
  checkUsableConstructionFolderPathLength: function(folderPath) {
    folderPath = path.resolve(folderPath);
    if (MAX_CONSTRUCTION_FOLDER_PATH_LENGTH < folderPath.length) {
      return { usable: false, maxLength: MAX_CONSTRUCTION_FOLDER_PATH_LENGTH };
    }
    return { usable: true, maxLength: MAX_CONSTRUCTION_FOLDER_PATH_LENGTH };
  }
};


