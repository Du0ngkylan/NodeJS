'use strict';

// Goyo modules.
const logger = require('../goyo-log')('get-license');
const licenseManager = require('../license/goyo-license-manager');

var licenseInfo = {
  getLicense: async function() {
    try {
      return { 
        "device_code": licenseManager.deviceCode,
        "device_id" : licenseManager.deviceId,
        "license_key" : licenseManager.licenseKey,
        "license_type" : licenseManager.licenseType,
      };
    } catch (ex) {
      logger.error("Failed to getLicense", ex);
      throw ex;
    }
  }
};

module.exports = licenseInfo;