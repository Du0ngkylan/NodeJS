'use strict';
// Use regedit module for load installPath with unicode character 
var regedit = require('regedit');
// Use rage-edit module for no promise and can delete value of entry 
var {Registry} = require('rage-edit');

const REGISTRY_PATH = 'HKLM\\SOFTWARE\\Lecre\\GOYO\\2020';
const reg = new Registry(REGISTRY_PATH);

/*
 * \HKEY_LOCAL_MACHINE\SOFTWARE\Lecre\KuraemonGoyotashi2019\
 * 
 * * InstallPath: String
 * * LicenseKey: String
 * * LicenseType: String
 * * DeviceCode: String
 * * DeviceId: String
 * 
 * LicenseTypeの有無で登録済みか否かを判定
 * 
 * LicenseTypeなし→未登録
 * LicenseType=='trial'→DeviceCode,DeviceIdがあること、DeviceCodeが一致すること
 * LicenseType=='standard'/'professional'→LicenseKey,DeviceCode,DeviceIdがあること、DeviceCodeが一致すること
 */

module.exports = {
  async loadLicenseInfo() {
    try {
      let ldata = await reg.get('ldata');
      if (ldata) {
        return this._decodeLicense(ldata);
      }
    } catch(e) {
      return false;
    }
  },

  async loadInstallPath() {
    /* It not support unicode of key value, using regedit until this issue fixed.
    let installPath = await reg.get('InstallPath');
    return installPath ? installPath : null;
    */
     
    let regInstallPath = REGISTRY_PATH;
    return new Promise((resolve, reject) => {
      regedit.list(regInstallPath, function(err, result) {
        if (err) {resolve(null)}
        if (result[regInstallPath].hasOwnProperty('values') && 
          result[regInstallPath].values.hasOwnProperty('InstallPath') ) {
            resolve(result[regInstallPath].values.InstallPath.value);
        } else {resolve(null)}
      });
    });
  },

  async storeTrialLicenseInfo(deviceCode, deviceId, expiryTime) {
    let expectLdata = this._encodeLicense('', 'trial', deviceCode, deviceId, expiryTime.toString());
    await reg.set('ldata',expectLdata);
    let actualLdata = await reg.get('ldata');
    return expectLdata === actualLdata ? true : false;
  },

  async storeCommercialLicenseInfo(licenseKey, licenseType, deviceCode, deviceId) {
    let expectLdata = this._encodeLicense(licenseKey, licenseType, deviceCode, deviceId, '');
    await reg.set('ldata',expectLdata);
    let actualLdata = await reg.get('ldata');
    return expectLdata === actualLdata ? true : false;
  },

  async removeLicenseInfo() {
    await Registry.delete(REGISTRY_PATH,'ldata');
    let result = await reg.get('ldata');
    return result ? false : true;
  },

  _encodeLicense(licenseKey, licenseType, deviceCode, deviceId, expiryTime) {
    let base64licenseType = Buffer.from(licenseType).toString('base64');
    let base64deviceId = Buffer.from(deviceId).toString('base64');
    let utf8Ldata = `${licenseKey}||${base64licenseType}||${base64deviceId}||${deviceCode}||${expiryTime}`;
    return Buffer.from(utf8Ldata).toString('base64');
  },

  _decodeLicense(ldata) {
    try {
      let utf8Ldata = Buffer.from(ldata, 'base64').toString('utf8').split('||');
      let licenseKey = utf8Ldata[0];
      let licenseType = Buffer.from(utf8Ldata[1], 'base64').toString('utf8');
      let deviceId = Buffer.from(utf8Ldata[2], 'base64').toString('utf8');
      let deviceCode = utf8Ldata[3];
      let expiryTime = parseInt(utf8Ldata[4]);

      return {licenseKey,licenseType,deviceId,deviceCode, expiryTime};
    } catch (error) {return null;}
  },
};
