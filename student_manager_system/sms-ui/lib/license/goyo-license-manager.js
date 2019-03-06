'use strict';

// Node.js modules.
const assert = require('assert');

// Goyo modules.
const goyoRegistry = require('./goyo-registry-accessor');
const logger = require('../goyo-log')('goyo-license-manager');
const { appEnv } = require('../goyo-app-env');
const goyoAppDefaults = require('../goyo-app-defaults');

var licenseInfo = null;
var _remainingTime = null;

module.exports = {

  // These four getters will be usable after calling checkLicense() or checkAndRegisterLicnse().
  get licenseKey() {
    assert(licenseInfo);
    return licenseInfo.licenseKey;
  },
  get licenseType() {
    assert(licenseInfo);
    return licenseInfo.licenseType;
  },
  get licenseTypeName() {
    assert(licenseInfo);
    return (licenseInfo.licenseType==='standard') ? 'Standard'
      : (licenseInfo.licenseType==='professional') ? 'Professional'
      : '体験版';
  },
  get deviceId() {
    assert(licenseInfo);
    return licenseInfo.deviceId;
  },
  get deviceCode() {
    assert(licenseInfo);
    return licenseInfo.deviceCode;
  },
  get expiryTime() {
    assert(licenseInfo);
    return licenseInfo.expiryTime;
  },
  get remainingTime() {
    if ( _remainingTime != null ) return _remainingTime;

    let now = Date.now()/1000;                          // down scale to UnixTime
    return licenseInfo.expiryTime - now;
  },


  // Only checking license, not show register window.
  // This function is called from command-main.js.
  async checkLicense(remoteCheck = true) {
    // TODO: enable license check procedure for beta.
    if (appEnv.settings.hasOwnProperty('disableLicenseCheck') && appEnv.settings['disableLicenseCheck']) {
      licenseInfo = {licenseKey:'no license', licenseType:'professional', deviceId: 'dummy device id', deviceCode: 'dummy device code'}
      logger.info(`license check skipped.`);
      return true;
    }

    licenseInfo = await goyoRegistry.loadLicenseInfo();
    logger.info(`license: ${JSON.stringify(licenseInfo,null,2)}`);

    if (!licenseInfo) {
      return false;
    }

    if (!await checkLicenseLocally(licenseInfo)) {
      await goyoRegistry.removeLicenseInfo();
      licenseInfo = null;
      return false;
    }
    logger.info(`local check pass.`);

    if (!checkLicenseProductOrTrial(licenseInfo)) {
      return false;
    }
    logger.info(`local check2 pass.`);

    if (remoteCheck && !await checkLicenseRemotely(licenseInfo)) {
      await goyoRegistry.removeLicenseInfo();
      licenseInfo = null;
      return false;
    }
    logger.info(`remote check pass.`);

    return true;
  },

  // Checking license, and show register window if no license is registered yet.
  // This function is called from ui-main.js.
  async checkLicenseWithErrorDialog() {
    if (appEnv.settings.hasOwnProperty('disableLicenseCheck') && appEnv.settings['disableLicenseCheck']) {
      licenseInfo = {licenseKey:'no license', licenseType:'professional', deviceId: 'dummy device id', deviceCode: 'dummy device code'}
      logger.info(`license check skipped.`);
      return true;
    }

    const goyoDialog = require('../goyo-dialog-utils');
    licenseInfo = await goyoRegistry.loadLicenseInfo();
    logger.debug(`license: ${JSON.stringify(licenseInfo,null,2)}`);

    if (!licenseInfo) {
      return false;
    }

    if (!await checkLicenseLocally(licenseInfo)) {
      await goyoRegistry.removeLicenseInfo();
      licenseInfo = null;
      await goyoDialog.showErrorMessageDialog(null,
        goyoAppDefaults.DIALOG_TITLE,
        'ライセンス状態が不正です。もう一度ライセンス登録を行ってください。', 'OK');
      return false;
    }
    logger.info(`local check pass.`);

    if (!checkLicenseProductOrTrial(licenseInfo)) {
      return false;
    }
    logger.info(`local check2 pass.`);

    if (!await checkLicenseRemotely(licenseInfo)) {
      await goyoRegistry.removeLicenseInfo();
      licenseInfo = null;
      await goyoDialog.showErrorMessageDialog(null,
        goyoAppDefaults.DIALOG_TITLE,
        'このパソコンのライセンス認証は解除されています。\n再度シリアル番号を入力してください。', 'OK');
      return false;
    }
    logger.info(`remote check pass.`);

    return true;
  },

  async registerLicense() {
    const goyoWebApi = require('../goyo-web-api');
    const goyoDialog = require('../goyo-dialog-utils');

    try {
      if (!await goyoWebApi.webApiIsAccessible()) {
        let message = (goyoAppDefaults.APPLICATION_TYPE === 'TRIAL')
          ? '体験版を利用するにはインターネット接続が必要です。'
          : 'シリアル番号を登録するにはインターネット接続が必要です。';
        await goyoDialog.showErrorMessageDialog(null, goyoAppDefaults.DIALOG_TITLE, message, 'OK');
        return false;
      }

      let result = await goyoDialog.showLicenseRegisterDialog(goyoAppDefaults.APPLICATION_TYPE);
      if (!result) {
        return false;
      }

      licenseInfo = await goyoRegistry.loadLicenseInfo();
      return true;
    } catch(e) {
      logger.error('registerLicense failed.', e);
    }

    return false;
  },
};

async function checkLicenseLocally(licenseInfo) {
  try {
    if (!['trial', 'standard', 'professional'].includes(licenseInfo.licenseType)) {
      logger.debug(`checkLicenseLocally: invalid licenseType.`);
      return false;
    }

    if (licenseInfo.licenseKey ==='' && ['standard', 'professional'].includes(licenseInfo.licenseType)) {
      logger.debug(`checkLicenseLocally: licenseKey unspecified.`);
      return false;
    }

    const goyoDeviceInfo = require('./goyo-device-code')
    const deviceCode = await goyoDeviceInfo.getDeviceCode();
    if (licenseInfo.deviceCode !== deviceCode) {
      logger.debug(`checkLicenseLocally: device code unmatch\n\texpeced:${deviceCode}\n\tregistry:${licenseInfo.deviceCode}`);
      return false;
    }

    return true;
  } catch(e) {
    logger.error('checkLicenseLocally failed.', e);
    return false;
  }
}

function checkLicenseProductOrTrial(licenseInfo) {
  try {
    if (goyoAppDefaults.APPLICATION_TYPE === 'TRIAL' && licenseInfo.licenseType !== 'trial') {
      logger.debug(`checkLicenseLocally: TRIAL application and ${licenseInfo.licenseType}`);
      return false;
    }

    if (goyoAppDefaults.APPLICATION_TYPE !== 'TRIAL' && licenseInfo.licenseType === 'trial') {
      logger.debug(`checkLicenseLocally: PRODUCT application and trial license`);
      return false;
    }

    return true;
  } catch(e) {
    logger.error('checkLicenseProductOrTrial failed.', e);
    return false;
  }
}

async function checkLicenseRemotely(licenseInfo) {
  const goyoWebApi = require('../goyo-web-api');

  try {
    if (!await goyoWebApi.webApiIsAccessible()) {
      logger.debug(`checkLicenseRemotely: no Internet access.`);
      // Pass remote check if the computer is not connected to Internet.
      return true;
    }

    let response = await goyoWebApi.checkLicense(licenseInfo.deviceId, licenseInfo.deviceCode);
    if (response.code != 200) {
      logger.debug(`checkLicenseRemotely: checkLicense NG.`);
      return false;
    }

    if (goyoAppDefaults.APPLICATION_TYPE === 'TRIAL') {
      //update local check expiryTime
      if ( response.limited_at != licenseInfo.expiryTime ) {
        licenseInfo.expiryTime = response.limited_at;
        await goyoRegistry.storeTrialLicenseInfo(licenseInfo.deviceCode, licenseInfo.deviceId, licenseInfo.expiryTime);
      }

      _remainingTime = response.rest_time;
      if (_remainingTime != null && _remainingTime < 0) {
        return false;
      }
    }

    return true;
  } catch(e) {
    logger.error('checkLicenseRemotely failed.', e);
  }

  return true;
}

