'use strict';

// Node.js modules.
const EventEmitter = require('events');
const path = require('path');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const goyoAppFolder = require('./goyo-appfolder');
const logger = require('./goyo-log')('goyo-program-settings');

// 3rd-party modules
const fse = require('fs-extra');


// Module internal variables.
var currentSetting;

// Module
const programSettings = {
  isInitialize(){
    if(currentSetting){
      return true;
    }else{
      return false;
    }
  },
  get backupSettings() { return currentSetting.backupSettings; },
  get dataManagement() { return currentSetting.dataManagement; },
  get displayImage() { return currentSetting.displayImage; },
  get displaySettings() { return currentSetting.displaySettings; },
  get imageDetermination() { return currentSetting.imageDetermination; },
  get importImage() { return currentSetting.importImage; },
  get menuSettings() { return currentSetting.menuSettings; },
  get otherSettings() { return currentSetting.otherSettings; },
  get globalFrameSettings() { return currentSetting.globalFrameSettings; },
  get clipart() { return currentSetting.clipart; },

  async initialize() {
    currentSetting = (await bookrackAccessor.getProgramSettings()).programSettings;
    deepFreeze(currentSetting);
  },

  async showEditDialog(parent) {
    try {
      let newSetting = await goyoDialog.showProgramSettingDialog(parent, { programSettings: JSON.parse(JSON.stringify(currentSetting))});
      if (!newSetting) { return false; }

      if (newSetting.programSettings.dataManagement.rootFolder !== currentSetting.dataManagement.rootFolder) {
        const windowHandler = require('./window-controller/window-handler');

        let newRootFolder = (newSetting.programSettings.dataManagement.rootFolder==='')
          ? goyoAppFolder.getAppFolder()
          : newSetting.programSettings.dataManagement.rootFolder;

        let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent, "質問", "本当に、基本フォルダを" + newRootFolder +
          "\nに移動してよろしいですか?\n\n" + "　　《注意》\n" + "　　外付けHDDを指定する場合は常に同じドライブ名で\n" + "　　接続されている必要があります。",
          "はい(&Y)", "いいえ(&N)", true);

        
        if (result) {
          let messageWindow;
          try {
            messageWindow = await windowHandler.openSimpleMessageWindow(parent, goyoAppDefaults.DIALOG_TITLE, 
              'データフォルダを移動しています...');
            // let pos = messageWindow.getPosition();
            // if (pos.length > 1) {
            //   messageWindow.setPosition(pos[0], pos[1] - 140, false);
            // }
            messageWindow.show();
            await moveDataFolders(parent, currentSetting.dataManagement.rootFolder, newSetting.programSettings.dataManagement.rootFolder);
            messageWindow.destroy();
            messageWindow = null;
            await goyoDialog.showSimpleMessageDialog(
              parent, goyoAppDefaults.DIALOG_TITLE,
              'データフォルダの移動が完了しました', 'OK');
          } catch(e) {
            logger.error('showEditDialog move root folder', e);
          } finally {
            if (messageWindow) { messageWindow.destroy(); }
          }
        } else {
          newSetting.programSettings.dataManagement.rootFolder = currentSetting.dataManagement.rootFolder;
        }
      }

      await bookrackAccessor.updateProgramSettings(newSetting.programSettings);

      let oldSetting = currentSetting;
      if (oldSetting.displayImage.windowSettings.backColor !== newSetting.programSettings.displayImage.windowSettings.backColor) {
        this.emit('change-bkgrcolor', newSetting.programSettings.displayImage.windowSettings.backColor);
      }
      currentSetting = (await bookrackAccessor.getProgramSettings()).programSettings;
      deepFreeze(currentSetting);
      this.emit('update', currentSetting, oldSetting);
      //logger.debug(currentSetting);

      return this;
    } catch(e) {
      logger.error('showEditDialog', e);
    }
    return null;
  },

  async editPhotoFileInformationSetting(parent) {
    try {
      let newSetting = await goyoDialog.showPhotoFileInformationSelectionDialog(
        parent,
        { programSettings: JSON.parse(JSON.stringify(currentSetting))}
      );
      if (!newSetting) { return false; }

      await bookrackAccessor.updateProgramSettings(newSetting.programSettings);

      let oldSetting = currentSetting;
      currentSetting = (await bookrackAccessor.getProgramSettings()).programSettings;
      deepFreeze(currentSetting);
      this.emit('update', currentSetting, oldSetting);

      return this;
    } catch(e) {
      logger.error('failed to editPhotoFileInformationSetting', e);
    }
    return null;
  },

};

Object.setPrototypeOf(programSettings, EventEmitter.prototype);
module.exports = programSettings;


// Internal functions.

function deepFreeze(o) {
  Object.freeze(o);
  for (let propKey in o) {
    let prop = o[propKey];
    if (!o.hasOwnProperty(propKey) || !(typeof prop === "object") || Object.isFrozen(prop)) {
      continue;
    }
    deepFreeze(prop);
  }
}

async function moveDataFolders(parent, _oldFolder, _newFolder) {
  let newFolder = (_newFolder==='') ? goyoAppFolder.getAppFolder() : _newFolder;
  let oldFolder = (_oldFolder==='') ? goyoAppFolder.getAppFolder() : _oldFolder;

  const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
  await sleep(1000);

  let progressWindow = goyoDialog.showProgressDialog(parent);
  try {
    let { constructions } = await bookrackAccessor.getConstructions();
    let total = constructions.length;
    let done = 0;
    for (let construction of constructions) {
      if (path.dirname(construction.dataFolder) === oldFolder) {
        // move data folder.
        try {
          let detail = (await bookrackAccessor.getConstructionDetail(construction.constructionId, false)).construction;
          let newPath = await makeNewConstructionPath(newFolder, path.basename(detail.dataFolder));
          detail.dataFolder = newPath;
          detail.isExternalFolder = false;
          detail.isSharedFolder = false;
  
          await bookrackAccessor.updateConstruction(detail);
        } catch(e) {
          logger.error('moveDataFolder change data folder', e);
        }
      } else if (path.dirname(construction.dataFolder) === newFolder) {
        // update 'isExternalFolder' as true
        try {
          let detail = (await bookrackAccessor.getConstructionDetail(construction.constructionId, false)).construction;
          detail.isExternalFolder = false;
          detail.isSharedFolder = false;
          await bookrackAccessor.updateConstruction(detail);
        } catch(e) {
          logger.error('moveDataFolder change external flag', e);
        }
      } else {
        // Do nothing.
      }
      progressWindow.setProgress((++done)/total);
    }  
  } finally {
    await progressWindow.close();
    await sleep(1000);
  }
  
}

async function makeNewConstructionPath(dir, oldBaseName) {
  let candidateName = oldBaseName;

  while (await fse.exists(path.join(dir, candidateName))) {
    logger.debug(`candidateName: ${candidateName}`);
    if (/\d+$/.test(candidateName)) {
      candidateName = candidateName.replace(/\d+$/, (m) => parseInt(m)+1);
    } else {
      candidateName += '1';
    }
  }

  return path.join(dir, candidateName);
}

