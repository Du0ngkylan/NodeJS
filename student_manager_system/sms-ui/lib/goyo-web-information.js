'use strict'

// Electron modules.
const { shell, protocol } = require('electron');

const logger = require('./goyo-log')('goyo-web-information');
const webAPI = require('./goyo-web-api');
const goyoDialog = require('./goyo-dialog-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const windownHandler = require('./window-controller/window-handler');
const licenseManager = require('./license/goyo-license-manager');
const uiParam = require('./goyo-ui-parameters')('goyo-web-information');
const menuActions = require('./menus/goyo-menu-actions');
const DATE = (new Date().toLocaleDateString('ja', { year: 'numeric', month: 'numeric', day: 'numeric' })).split("/").join("-");
var readListTemp = [];
var informationReading;
var win;
let isSkipCheckMessage = true;

module.exports = {
  _customSchema: 'goyo',
  _info: null,
  async initialize() {
    let info = null;
    let deviceId = licenseManager.deviceId;
    let version  = goyoAppDefaults.VERSION;
    let architecture = (process.arch==='x64') ? 'x64' : 'x86';
    try {
      info = await webAPI.getInformationList(deviceId, version, architecture);
      this._info = await this._getInfo(info);
      // Register protocol 'goyo'.
      logger.debug('initialize information-protocol');
      protocol.registerHttpProtocol(this._customSchema, async (request, callback) => {
        logger.debug('registerHttpProtocol');
        logger.debug(' url=' + request.url);
        if (request.url.indexOf('startUpdate') > -1) {
          if (isSkipCheckMessage) {
            await menuActions.run('SPECIAL:UPDATE-APPLICATION-FROM-INFO-SKIP-MESSAGE', win);
          } else {
            await menuActions.run('SPECIAL:UPDATE-APPLICATION-FROM-INFO', win);
          }
        } else if (request.url.indexOf('openUrl') > -1) {
          const query = request.url.split('?')[1];
          if (query) {
            const indexParam = query.split('&')
              .map(param => param.split('='))
              .find(param => param[0] === 'index');
            const index = indexParam[1];
            if (index && informationReading.openurl_list[index]) {
              shell.openExternal(informationReading.openurl_list[index]);
            }
          }
        } else if (request.url.indexOf('close') > -1) {
          win.close();
        }
      });
    } catch(e) {
      logger.info('could not get goyotashi web information.');
    }
  },
  async finalize() {
    // Unregister protocol 'goyo'.
  },

  updateExists() {
    // Wheather the update exists or not.
    return this._info
            ? this._info.is_exist_update && this._info.info_list.find(info => info.type === "update") != null
            : false;
  },

  async openUnreadInfomationList(parent) {
    const asyncShowInfoDialog = async (showInfo) => {
      this.updateReadListUiParam(showInfo);
      informationReading = showInfo;
      const url = `${showInfo.url}?t=${Date.now()}`;
      win = await windownHandler.openInformationWindow(parent, url, Number(showInfo.width), Number(showInfo.height)); 
      await new Promise((resolve, reject) => {
        win.setTitle(showInfo.title);
        win.on('close', () => resolve());
        win.show();
      });
    };

    if ( this._info && this._info.info_list) {
      //show update info only when update is exists
      let showInfoList;
      isSkipCheckMessage = true;
      if (this.updateExists()) {
        showInfoList = this._info.info_list;
      } else {
        showInfoList = this._info.info_list.filter( info => info.type === "info" );
      }

      for( const showInfo of showInfoList ) {
        await asyncShowInfoDialog(showInfo);
      }
    }
  },

  async openUpdateInformation(parent) {
    let showInfo = null;
    isSkipCheckMessage = false;
    if (this._info) {
      //get update info
      showInfo = this._info.info_list.find(info => info.type === "update");
    }

    if (showInfo) {
      this.updateReadListUiParam(showInfo);
      informationReading = showInfo;
      const url = `${showInfo.url}?t=${Date.now()}`;
      win = await windownHandler.openInformationWindow(parent, url, Number(showInfo.width), Number(showInfo.height));
      win.setTitle(showInfo.title);
      win.show();
    } else {
      goyoDialog.showSimpleMessageDialog(parent, "お知らせ", "新しいお知らせはありません。", 'OK');
    }
  },
  async _getInfo(info) {
    if (!info || info.code === undefined) {
      logger.debug('Can not connect to server to get information list');
      return null;
    }
    switch (info.code) {
      case 200:
        const apiInfoList = info.info_list || []

        const displayInfoList = apiInfoList
          //check frequency
          .filter(infoElem => {
            let record = uiParam.readList.find(record => record.info_id === infoElem.info_id)
            if ( record ) {
              switch (Number(infoElem.frequency)) {
                case 2:
                  return record.lastReadDate !== DATE;
                case 3:
                  return false;
              }
            }
            return true;
          })

        let result = {
          "code": info.code,
          "is_exist_update": info.is_exist_update || false,
          "info_list": displayInfoList
        };

        return result;
      case 400:
        logger.error('Response: Parameter shortage');
        return null;
      case 500:
        logger.error('Response: Failure');
        return null;
    }
  },
  async updateReadListTemp (info_id) {
    readListTemp.push(info_id);
    for (let index = 0; index < this._info.info_list.length; index++) {
      const info = this._info.info_list[index];
      if (info.info_id === info_id) {
        this._info.info_list.splice(index, 1);
        break;
      }
    }
  },
  async updateReadListUiParam (info) {
    let oldInfo = uiParam.readList.find(elem => {return info.info_id === elem.info_id});
    if (oldInfo) {
      oldInfo.lastReadDate = DATE;
    } else {
      uiParam.readList.push({"info_id": info.info_id,"lastReadDate": DATE});
    }
  }
};