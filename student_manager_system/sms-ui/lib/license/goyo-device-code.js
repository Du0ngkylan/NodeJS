'use strict';

const wmic = require('node-wmic');

module.exports = {

  ////////////////////////////////
  // Get Device ID
  // Device ID is wmic information.
  // 
  // contains:
  //  BaseBoard.Manufacturer
  //  BaseBoard.Product
  //  BaseBoard.SerialNumber
  //  BaseBoard.Version
  //  DiskDrive.SerialNumber
  //
  // Combine these information with '-'.
  // wmic has error, return ""
  ////////////////////////////////

  getDeviceCode: async function () {
    let deviceCode = "--DEFAULTDEVICECODE--";
    try {
      // get baseboard information
      let baseboardResult = await wmic.baseboard();
      // get diskdrive information
      let diskdriveResult = await wmic.diskdrive();

      deviceCode = createDeviceId(baseboardResult, diskdriveResult);
    } catch (error) {
      console.log(error);
    }

    return deviceCode;
  },
};

function createDeviceId(baseboardResult, diskdriveResult) {
  let diskdriveSerialNumber = "";
  //Choose MediaType is "Fixed hard disk media"
  for(let diskdrive of diskdriveResult) {
    if (diskdrive.MediaType === "Fixed hard disk media") {
      diskdriveSerialNumber = diskdrive.SerialNumber;
    };
  }

  let deviceCode = baseboardResult.Manufacturer + '-' + 
            baseboardResult.Product + '-' + 
            baseboardResult.SerialNumber + '-' + 
            baseboardResult.Version + '-' +
            diskdriveSerialNumber;

  //encode to base64
  var buffer = new Buffer(deviceCode);
  return buffer.toString('base64');
};