'use strict';

// Node.js modules.
const assert = require('assert');
const fs = require('fs');
const fse = require('fs-extra');
const del = require('del');
const os = require('os');
const path = require('path');

// Electron modules.
const {
  remote
} = require('electron');

// Goyo modules.
const GoyoArchiver = require("goyo-archiver");
const {
  viewMode,
  BookrackViewWindowSet
} = require('../../goyo-window-controller');
const backupOperation = require('../../goyo-backup-operation');
const bookrackAccessor = require('goyo-bookrack-accessor');
const goyoDialog = require('../../goyo-dialog-utils');
const goyoAppFolder = require('../../goyo-appfolder');
const goyoAppDefaults = require('../../goyo-app-defaults');
const goyoConstructionOperation = require('../../goyo-construction-operation');
const windowHandler = require('../../window-controller/window-handler');
const logger = require('../../goyo-log')('backup-actions');
const { holdWindowsStop } = require('../../goyo-utils');
const licenseManager = require('../../license/goyo-license-manager');

// progress callback
const progress = async (done, total, info) => {
  let p = ((done / total) * 100).toFixed(0);
  logger.debug(
    `compression ---` + `[${done}/${total}]` +
    ` ${(" " + p).slice(-3)}%` +
    ` - (${info})`
  );
};

// Internal functions.
function unimplemented() {
  console.log('menu-actions: unimplemented action is executed');
}

function findAlbum(items) {
  for (let item of items) {
    if (item.bookrackItemType === 3) {
      return true;
    } else if (findAlbum(item.bookrackItems)) {
      return true;
    }
  }
  return false;
}

function getFirstAlbum(items) {
  for (let item of items) {
    if (item.bookrackItemType === 3) {
      return item;
    } else {
      let i = getFirstAlbum(item.bookrackItems);
      if (i != null) {
        return i;
      }
    }
  }
  return null;
}


//Fuction get all file
function getAllFile(path, array) {
  // let array = [];
  var curPath;
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      curPath = path + "\\" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        getAllFile(curPath, array);
      } else { // get file
        array.push(curPath);
      }
    });
  }
  return array;
};

const actions = {
  ///////////////////////////////////////////////////////////////////
  // backup
  ///////////////////////////////////////////////////////////////////
  'BACKUP:BACKUP-ALBUMS': { // Action for 「アルバムのバックアップを一括作成...」
    async isRunnable(type, target) {
      // TODO:after Release
      return false;
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    async run(parent, target) {
      let holder = holdWindowsStop();
      try {
        await backupOperation.dumpAlbums(parent, target.constructionId);
      } catch (e) {
        logger.error('BACKUP:BACKUP-ALBUMS', e);
      } finally {
        holder.release();
      }
    },
  },
  'BACKUP:BACKUP-ALBUM': {
    async isRunnable(type, target) {
      // TODO:after Release
      return false;
    },
    async run(parent, target) {
      // Action for 「アルバムのバックアップを作成...」
      unimplemented();
    },
  },
  'BACKUP:RESTORE-ALBUM': {
    async isRunnable(type, target) {
      // TODO:after Release
      return false;
    },
    async run(parent, target) {
      // Action for 「アルバムのバックアップを読み込み...」
      let holder = holdWindowsStop();
      try {
        await backupOperation.dumpAlbums(
          parent, target.constructionId, target.albumIds[0]);
      } catch (e) {
        logger.error('BACKUP:RESTORE-ALBUM', e);
      } finally {
        holder.release();
      }
    },
  },
  'BACKUP:BACKUP-CONSTRUCTION': {
    async isRunnable(type, target) {
      try {
        let bookrackItems = await target.bookrackItems;
        return findAlbum(bookrackItems);
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    // Action for 「本棚のバックアップを作成...」
    async run(parent, target) {
      let progressWindow = null;
      let resultConstructionDetail = null;
      let holder = holdWindowsStop();
      try {

        let constructionId = target.constructionId;
        resultConstructionDetail = await bookrackAccessor.getConstructionDetail(constructionId, true);

        let bookrackItems = await target.bookrackItems;
        let firstAlbum = getFirstAlbum(bookrackItems);
        if (firstAlbum == null) {
          throw new Error('not found albums.');
        }
        
        let goyoArchiver = new GoyoArchiver();
        goyoArchiver.initialize();

        let albumId = firstAlbum.bookrackItemId;
        let resultConstructionSettings = await bookrackAccessor.getConstructionSettings(constructionId);
        let resultPhotoInformationTree = await bookrackAccessor.getPhotoInformationTree(constructionId);
        let resultPrintSettings = await bookrackAccessor.getPrintSettings(constructionId, albumId);

        let version = {
          "version": goyoAppDefaults.VERSION
        };

        const filters = [{
          name: 'BKS(御用達2020本棚のバックアップ)',
          extensions: []
        },];

        var fileBackUp = await goyoDialog.showSaveFileSelectionDialog(
          parent,
          '本棚のバックアップを作成',
          '~\\' + resultConstructionDetail.construction.constructionName + '.bksx',
          filters
        );
        if (!fileBackUp) {
          return false;
        }
        const fileSizeInMegabytes = Math.round(resultConstructionDetail.construction.dataFolderSize / 1000000);
        let result = await goyoDialog.showSimpleBinaryQuestionDialog(
          parent,
          '確認',
          '本棚のバックアップを作成します。\nこの操作を完了するには、約' + fileSizeInMegabytes + 'MBの空きが保存先のディスクに\n必要です。\nよろしいですか？',
          "はい(&Y)", "いいえ(&N)", false);
        if (!result) {
          return;
        }

        var canceller = { cancel: false };
        progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });
        progressWindow.setProgress(0);

        // important! be sure to sync before file copy
        await bookrackAccessor.syncConstruction();

        let defaultPathSave = path.dirname(fileBackUp);
        const DB_CONSTRUCTION_PATH = resultConstructionDetail.construction.dataFolder;
        let searchStr = DB_CONSTRUCTION_PATH.lastIndexOf("\\");
        const NAME_FOLDER_CONSTRUCTION = DB_CONSTRUCTION_PATH.substring(searchStr);
        const ARCHIVER_CONSTRUCTION_PATH = defaultPathSave + NAME_FOLDER_CONSTRUCTION;

        resultConstructionDetail.construction.constructionId = 0;
        resultConstructionDetail.construction.contractee.contracteeId = 0;
        resultConstructionDetail.construction.contractor.contractorId = 0;
        resultConstructionDetail.construction.dataFolder = "";

        resultConstructionSettings.constructionSettings.dataFolder = "";

        resultPrintSettings.albumId = albumId;
        resultPrintSettings.printerSettings.deviceMode = "";
        resultPrintSettings.printerSettings.deviceNames = "";

        let jsonConstructionDetail = JSON.stringify(resultConstructionDetail);
        let jsonConstructionSettings = JSON.stringify(resultConstructionSettings);
        let jsonPhotoInformationTree = JSON.stringify(resultPhotoInformationTree);
        let jsonPrintSettings = JSON.stringify(resultPrintSettings);
        let jsonVersion = JSON.stringify(version);

        /* add file json */
        fs.appendFileSync(goyoAppFolder.getAppFolder() + '\\construction-detail.json', jsonConstructionDetail);
        fs.appendFileSync(goyoAppFolder.getAppFolder() + '\\construction-settings.json', jsonConstructionSettings);
        fs.appendFileSync(goyoAppFolder.getAppFolder() + '\\construction-photo-info.json', jsonPhotoInformationTree);
        fs.appendFileSync(goyoAppFolder.getAppFolder() + '\\print-settings.json', jsonPrintSettings);
        fs.appendFileSync(goyoAppFolder.getAppFolder() + '\\version.json', jsonVersion);

        let arrayInfoConstruction = [];
        arrayInfoConstruction.push('construction-detail.json',
          'construction-settings.json',
          'construction-photo-info.json',
          'print-settings.json',
          'version.json'
        );

        let arrayFileNameInDB = await getAllFile(DB_CONSTRUCTION_PATH, []);
        let indexStr = fileBackUp.lastIndexOf("\\");
        const NAME_FOLDER_ARCHIVER = fileBackUp.substring(indexStr + 1);

        /* ------compression------ */
        logger.debug(`begin compression`);
        for (let fileJson of arrayInfoConstruction) {
          goyoArchiver.addFilePath(goyoAppFolder.getAppFolder() + '\\' + fileJson, fileJson);
        }
        for (let infoAddFile of arrayFileNameInDB) {
          if (infoAddFile.substring(DB_CONSTRUCTION_PATH.length + 1) == 'constructionDB.db' ||
            infoAddFile.substring(DB_CONSTRUCTION_PATH.length + 1) == 'kouji.XML' ||
            infoAddFile.substring(DB_CONSTRUCTION_PATH.length + 1) == 'albumItemDB.db-shm' ||
            infoAddFile.substring(DB_CONSTRUCTION_PATH.length + 1) == 'albumItemDB.db-wal' ||
            infoAddFile.substring(DB_CONSTRUCTION_PATH.length + 1) == 'NetProf.dat'
          ) {
            // not add file
          } else {
            let archiver_path_construction = infoAddFile.replace(DB_CONSTRUCTION_PATH, ARCHIVER_CONSTRUCTION_PATH).substring(defaultPathSave.length + 1);
            goyoArchiver.addFilePath(infoAddFile, archiver_path_construction);
          }
        }
        goyoArchiver.doCompression(fileBackUp,
          /* success  */
          async () => {
            logger.debug(`end compression, created bksx file: ${NAME_FOLDER_ARCHIVER}`);
            await progressWindow.close();
            for (let ignoreFile of arrayInfoConstruction) {
              if (fs.existsSync(goyoAppFolder.getAppFolder() + '\\' + ignoreFile)) {
                fs.unlinkSync(goyoAppFolder.getAppFolder() + '\\' + ignoreFile);
              }
            }
            setTimeout(() => {
              goyoDialog.showSimpleMessageDialog(parent, '確認', '本棚のバックアップを作成しました。', 'OK');
            }, 100);
          },
          /* progress  */
          async (done, total, info) => {
            progressWindow.setProgress(done / total);
            if (canceller.cancel) {
              goyoArchiver.setCancel(true);
              await progressWindow.close();
            }
            progress(done, total, info);
          },
          /* cancel  */
          async () => {
            logger.debug(`canceled...`);
            for (let ignoreFile of arrayInfoConstruction) {
              if (fs.existsSync(goyoAppFolder.getAppFolder() + '\\' + ignoreFile)) {
                fs.unlinkSync(goyoAppFolder.getAppFolder() + '\\' + ignoreFile);
              }
            }

            if (fs.existsSync(fileBackUp)) {
              del.sync(fileBackUp, { force: true });
              logger.debug(`delete ${fileBackUp}`);
            }    
          }
        );
      } catch (e) {
        logger.debug(`error: ${e}`);
        if (progressWindow != null)
          await progressWindow.close();
        let name = resultConstructionDetail != null ? resultConstructionDetail.construction.constructionName : "工事";
        await goyoDialog.showWarningMessageDialog(parent, 
          'エラー',
          `${name}のバックアップに失敗しました。`, 
          'OK');
      } finally {
        holder.release();
      }
    },
  },
  'BACKUP:RESTORE-CONSTRUCTION': {
    runnableWhileSharedLock : true,
    async run(parent, target) {
      // Action for 「本棚のバックアップを読み込み...」
      try {
        let countConstruction = (await bookrackAccessor.getConstructions()).constructions.length;
        if (licenseManager.licenseType === 'trial' && 
          countConstruction >= goyoAppDefaults.TRIAL_MAX_CONSTRUCTIONS) {
          await goyoDialog.showLicenseRestrictionDialog(parent, 7);
          return;
        }
        let currentConstructionId = target.constructionId;
        let goyoArchiver = new GoyoArchiver();
        goyoArchiver.initialize();
        let canceled = () => {
          goyoArchiver.setCancel(true);
          logger.debug(`canceled...`);
        };
        let inputFiles = await goyoDialog.showOpenFileSelectionDialog(
          parent,
          goyoAppDefaults.DIALOG_RESTORE_FILE_TITLE, '',
          goyoAppDefaults.restoreFileFilter, true);

        if (inputFiles === undefined) {
          logger.debug('cancel restore');
          return;
        }
        let inputFileSplit = inputFiles[0].split('\\');
        let restoreFileName = inputFileSplit.slice(-1)[0]
        let nameFolder = "goyo-" + String(Date.now());
        let pathArchiverFile = path.join(os.tmpdir(), nameFolder);
        let canceller = {
          cancel: false
        };
        let progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        // save_archive_path_file
        let restorePath = {
          filePaths: [],
          pushPath: function (filePath) {
            this.filePaths.push(filePath);
          },
          getPath: function () {
            return this.filePaths;
          }
        }

        goyoArchiver.doDecompression(
          inputFiles[0],
          pathArchiverFile,
          (err) => {
            progressWindow.close();
            if (err) {
              logger.debug(`error: ${err}`);
              goyoDialog.showWarningMessageDialog(parent, 'エラー',
              `${restoreFileName}の読み込みに失敗しました。`, 'OK');
            } else {
              let filePaths = restorePath.getPath()
              let filePathRestore = {}
              let pathSaveFile = []
              filePathRestore['directory'] = pathArchiverFile;
              let fullPath;

              for (let filePath of filePaths) {
                let length = 0;
                fullPath = path.join(pathArchiverFile, filePath);
                if (filePath.includes("/")) {
                  length = filePath.split("/").length;
                } else if (filePath.includes("\\")) {
                  length = filePath.split("\\").length;
                }
                if (length >= 2) {
                  // remove the folder prefix path (folder: constructionX)
                  filePath = filePath.substring(filePath.indexOf("/") + 1);
                  pathSaveFile.push(filePath);
                  filePathRestore[filePath] = fullPath;
                } else {
                  filePathRestore[filePath] = fullPath;
                }
              }
              restoreConstruction(parent, filePathRestore, pathSaveFile, currentConstructionId, restoreFileName);
            }
          },
          async (done, total, info) => {
            restorePath.pushPath(info)
            progressWindow.setProgress(done / (total));
            if (canceller.cancel) {
              goyoArchiver.setCancel(true);
              await progressWindow.close();
            }
          },
          canceled
        );
      } catch (e) {
        goyoDialog.showWarningMessageDialog(parent, 'エラー',
          `${restoreFileName}の読み込みに失敗しました。`, 'OK');
        logger.debug(`error: ${e}`);
        return;
      }
    },
  },
};



module.exports = actions;

async function restoreConstruction(parent, filePaths, pathSaveFile, currentConstructionId, restoreFileName) {
  let dirNewConstruction = "";
  let progressWindow = null;
  let constructionId = null;
  let isPressCancelProgress = false;
  let holder = holdWindowsStop();
  try {
    let keyPaths = [
      'directory',
      'construction-detail.json',
      'construction-photo-info.json',
      'construction-settings.json',
      'print-settings.json'
    ]

    let constructionDetailObj = JSON.parse(
      fs.readFileSync(filePaths[keyPaths[1]], 'utf8'));
    let constructionPhotoInfoObj = JSON.parse(
      fs.readFileSync(filePaths[keyPaths[2]], 'utf8'));
    let constructionSettingObj = JSON.parse(
      fs.readFileSync(filePaths[keyPaths[3]], 'utf8'));
    let printSettingObj = JSON.parse(
      fs.readFileSync(filePaths[keyPaths[4]], 'utf8'));

    dirNewConstruction = await goyoDialog.showRestoreConstructionPathDialog(parent);
    if (dirNewConstruction == undefined) {
      return;
    }
    let newFilePaths = createNewPathStore(dirNewConstruction, pathSaveFile);
    let totalFile = Object.keys(newFilePaths).length;
    let done = 1;
    let canceller = {
      cancel: false
    };
    progressWindow = goyoDialog.showProgressDialog(parent, () => {
      canceller.cancel = true;
    });
    progressWindow.setProgress(0);

    let { constructions } = await bookrackAccessor.getConstructions();
    let displayNumber = constructions.length + 1;

    constructionDetailObj.construction.dataFolder = dirNewConstruction;
    constructionDetailObj.construction.displayNumber = displayNumber;
    let defaultFolder = goyoAppFolder.getAppDataFolder();
    logger.debug(`defaultFolder=${defaultFolder}`);
    logger.debug(`out=${path.dirname(dirNewConstruction)}`);
    if (defaultFolder === path.dirname(dirNewConstruction)) {
      constructionDetailObj.construction.isExternalFolder = false;
      constructionDetailObj.construction.isSharedFolder = false;
    } else {
      constructionDetailObj.construction.isExternalFolder = true;
      constructionDetailObj.construction.isSharedFolder = true;
    }

    let response = await bookrackAccessor.updateConstruction(constructionDetailObj.construction);
    constructionId = response.constructionId;
    constructionDetailObj.construction.constructionId = constructionId;
    await bookrackAccessor.updateConstructionSettings(constructionId, constructionSettingObj.constructionSettings)
    await bookrackAccessor.updatePhotoInformationItems(constructionId, constructionPhotoInfoObj)

    for (let key in newFilePaths) {
      logger.debug(`${filePaths[key]}->${newFilePaths[key]}`)
      await fse.copy(filePaths[key], newFilePaths[key]);
      progressWindow.setProgress(done / (totalFile));
      if (canceller.cancel) {
        isPressCancelProgress = true;
        throw "restore: cancel progress!";
      }
      done += 1
    }
    await goyoConstructionOperation.updateSharedConstructionSettings(constructionDetailObj.construction);

    await progressWindow.close();
    await bookrackAccessor.updatePrintSettings(constructionId,
      printSettingObj.albumId,
      printSettingObj)

    let bookrackId = (await bookrackAccessor.getBookracks(constructionId)).bookracks[0].bookrackItemId;
    setTimeout(() => {
      BookrackViewWindowSet.close(currentConstructionId);
    }, 200)

    viewMode.setNextMode(
      viewMode.MODE_BOOKRACK_VIEW, {
        constructionId,
        bookrackId
      });
  } catch (e) {
    if (dirNewConstruction != '' || dirNewConstruction != undefined) {
      await fse.remove(dirNewConstruction);
    }
    if (constructionId != null) {
      bookrackAccessor.deleteConstruction(constructionId);
    }
    if (progressWindow != null) {
      await progressWindow.close();
    }
    if(!isPressCancelProgress){
      await goyoDialog.showWarningMessageDialog(parent, 'エラー',
      `${restoreFileName}の読み込みに失敗しました。`, 'OK');
      logger.debug(`restoreConstruction_function: ${e}`);
    }
    return;
  } finally {
    holder.release();
  }
}

function createNewPathStore(dirNewConstruction, pathSaveFile) {
  let newPaths = []
  for (let filePath of pathSaveFile) {
    newPaths[filePath] = path.join(dirNewConstruction, filePath);
  }
  return newPaths;
}
