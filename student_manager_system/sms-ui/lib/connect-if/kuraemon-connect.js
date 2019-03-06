'use strict';

// Node modules
const {exec} = require('child_process');
const arch = require('os').arch();

// Use regedit module for load installPath with unicode character 
var regedit = require('regedit');

//  goyo modules
const logger = require('../goyo-log')('kuraemon-connect');
const { appEnv } = require('../goyo-app-env');

/*

[テストサーバーコネクト]
キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{C459EFE3-377C-4CF8-9B58-EFA1AE4B69CD}_is1
値名：DisplayIcon
値(例)：C:\Program Files (x86)\Lecre\蔵衛門コネクト2019(TEST)\KuraemonConnect.exe

[本番サーバーコネクト]
キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{4CB906F0-1A57-4A64-A53B-22E1662B2169}_is1
値名：DisplayIcon
値(例)：C:\Program Files (x86)\Lecre\蔵衛門コネクト2019(TEST)\KuraemonConnect.exe

２）実行時パラメータの指定　(xxxx.exe option... )

KuraemonConnect.exe constructionId={工事ID} mode=createBlackboard
KuraemonConnect.exe constructionId={工事ID} mode=registerPhoto
KuraemonConnect.exe constructionId={工事ID}

３）追加仕様
蔵Padコネクトがあれば（両方存在するときも）、蔵Padコネクトを起動
工事黒板コネクトがあれば工事黒板コネクトを起動

値名：DisplayIcon
※32bitはWow6432Node無し

【蔵Padコネクト】
　＜テストサーバ用＞
　　キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{C459EFE3-377C-4CF8-9B58-EFA1AE4B69CD}_is1
　＜本番サーバ用＞
　　キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{4CB906F0-1A57-4A64-A53B-22E1662B2169}_is1


【工事黒板コネクト】
　＜テストサーバ用＞
　　キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{01E21D4D-7C5C-4A66-A9B8-C84730856FEF}_is1
　＜本番サーバ用＞
　　キー：HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{C6B9D811-01BC-4EA5-A326-5DF2C2BAC7C2}_is1

*/

module.exports = {
  async isRunnable() {
    logger.debug(`arch : ${arch}`);
    let path = await this.loadInstallPath();
    if (path == null) {
      path = await this.loadInstallPath(true);
    }
    return path != null;
  },

  async run(constructionId, mode='') {
    let path = await this.loadInstallPath();
    logger.debug(`path=${path}`);
    if (path == null) {
      path = await this.loadInstallPath(true);
      logger.debug(`path=${path}`);
      if (path == null) {
        return false;
      }
    }
    let exeMain = this.getConnectExePath(path);
    let modeParam = '';
    if (mode != '') {
      modeParam = `mode=${mode}`;
    }
    let exe = `${exeMain} constructionId=${constructionId} ${modeParam}`;
    logger.debug(exe);
    exec(
      exe,
      (error, stdout, stderr) => {
        logger.debug(stdout);
        logger.debug(stderr);
        if (error) {
          logger.error(`Failed to ${exe}`, error);
        }
      }
    );
    return true;
  },

  getConnectExePath(path) {
    let index = path.toLowerCase().indexOf('.exe');
    let exeMain = path;
    if (index > -1) {
      exeMain = path.substring(0, index + 4);
      exeMain = `"${exeMain}"` + " " + path.substring(index+4);
    }
    return exeMain;   
  },

  loadInstallPath(is32 = false) {
    let keys = appEnv.connectKey;
    let errors = [];

    return new Promise((resolve, reject) => {
      
      let i = 0;
      for (let key of keys) {
        if (is32 === true) {
          key = key.replace("Wow6432Node\\", "");
          logger.debug(`use ${key}`);
        }
        
        let regInstallPath = key;
        regedit.list(regInstallPath, function(err, result) {
          if (!err) {
            logger.debug(regInstallPath);
            //logger.debug(JSON.stringify(result,null,2));
            if (result[regInstallPath].hasOwnProperty('values')) {
              if (result[regInstallPath].values.hasOwnProperty('DisplayIcon')) {
                let p = result[regInstallPath].values.DisplayIcon.value;
                //logger.debug("resolve:"+ p);
                resolve(p);
              }
            }
            i++;
          } else {
            errors.push(err);
            i++;
            if (i == keys.length) {
              errors.forEach(e => {
                logger.info(`Failed to loadInstallPath:${regInstallPath}`);
              });
              resolve(null);
            }
          }
        });
      }
    });

  },

};
