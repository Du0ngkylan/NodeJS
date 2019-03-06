'use strict';

// NodeJS module
const fs = require('fs');
const https = require('https');
const fse = require('fs-extra');
const path = require('path');
// goyo-module
const { viewMode, windowHandler } = require('./goyo-window-controller');
const { shellopen } = require('./goyo-utils');
const goyoAppFolder = require('./goyo-appfolder');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const logger = require('./goyo-log')('goyo-update');
const webAPI = require('./goyo-web-api');
const licenseManager = require('./license/goyo-license-manager');

module.exports = {
  async checking() {
    try {
      return await webAPI.checkUpdate( licenseManager.deviceId, goyoAppDefaults.VERSION, (process.arch==='x64') ? 'x64' : 'x86');
    } catch (e) {
      return false;
    }
  },
  async download(parent=null, url, message='アップデートをダウンロードしています..') {
    let request;
    let messageWindow;
    logger.info(`start downloading ${url}`);

    // downloaded file name.
    let installerPath = path.join(goyoAppFolder.getAppFolder(), "newVersion.exe");
    //if (await fse.exists(installerPath)) {
    //  return installerPath;
    //}

    try {
      // show message window.
      if (message) {
        messageWindow = await windowHandler.openSimpleMessageAndProgressWindow(
          parent,
          goyoAppDefaults.DIALOG_TITLE,
          message,
          true,
          () => {
            request.abort();
          });
        messageWindow.show();
      }

      let result = await new Promise((resolve,reject) => {
        let file = fs.createWriteStream(installerPath, { flags: 'w' });

        request = https.get(url, response => {
          let len = parseInt(response.headers['content-length'], 10);
          let cur = 0;
          let sendValue = 0;
          let sendedValue = -1;
          response.pipe(file, { end: false });
          response.on("data", function(chunk) {
            cur += chunk.length;
            sendValue = Math.floor(cur*100/len)/100;
            if(sendValue > sendedValue){
              messageWindow.webContents.send('progress', sendValue);
              sendedValue = sendValue;
            }
          });
          response.on('error', e => { reject(e); request.abort(); file.destroy(); });
          response.on('end', () => {
            file.end();
            file.on('finish', () => resolve(installerPath));
          });
        });
        request.on('abort', () => {
          resolve(null);
          file.destroy();
        });
        request.on('error', e => { reject(e); request.abort(); file.destroy(); });
        file.on('error', e => { reject(e); request.abort(); });
      });

      return result;
    } finally {
      if (messageWindow) {
        messageWindow.destroy();
      }
    }
  },
  async updating(checkUpdate, parent) {
    return new Promise(async (resolve, reject) => {
      async function catchErr() {
        if (downloadSuccess) {
          downloadSuccess = false;
          messageWindow.destroy();
          await goyoDialog.showErrorMessageDialog(parent,
            goyoAppDefaults.DIALOG_TITLE, 'アップデート情報を取得できませんでした。', 'OK');
          if (await fse.exists(pathFileUpdate)) {
            await fse.unlink(pathFileUpdate);
          }
        }
        resolve(false);
      }
      logger.info(`start downloading ${checkUpdate.update.url}`);
      let request;
      let downloadSuccess = true;
      let pathFileUpdate = path.join(goyoAppFolder.getAppFolder(), "newVersion.exe");
      let messageWindow = await windowHandler.openSimpleMessageWindow(parent, goyoAppDefaults.DIALOG_TITLE,
        "アップデートをダウンロードしています..", true, () => {
          downloadSuccess = false;
          request.abort();
          resolve(false);
        });
      messageWindow.show();
      // Download file update
      if (await fse.exists(pathFileUpdate)) {
        await fse.unlink(pathFileUpdate);
      }
      let file = fs.createWriteStream(pathFileUpdate);
      file.on('error', () => catchErr());
      request = https.get(checkUpdate.update.url, async response => {
        response.pipe(file, true);
        response.on("error", () => catchErr());
      });
      request.on("error", () => catchErr());
      file.on("close", async () => {
        messageWindow.destroy();
        if (downloadSuccess) {
          let answer = await goyoDialog.showSimpleBinaryQuestionDialog(parent,
            goyoAppDefaults.DIALOG_TITLE,
            "アップデートを実行します",
            "はい(&Y)", "いいえ(&N)");
            if (answer) {
              shellopen(parent, pathFileUpdate);
              if (viewMode && viewMode.mainWindowHandle) {
                viewMode.closeCurrentModeWindow();
              }
              resolve(true);
            } else {
              resolve(false);
            }
        }else{
          resolve(false);
        }
      });
    });
  }
}