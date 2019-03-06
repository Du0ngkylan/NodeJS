'use strict';

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('get-building-master');
const path = require('path');
const os = require('os');
const accessor = {
  getBuildingMaster: async function(knackId) {
    try {
      let result;
      if (knackId === 76) {
        result = await bookrackAccessor.getGeneralConstructionMaster();
        result = JSON.parse(JSON.stringify(result)
                    .replace(/generalConstructionCode/g,'buildingMasterCode')
                    .replace(/generalConstructionName/g,'buildingMasterName')
                    .replace(/generalConstructionChildren/g,'buildingMasterChildren'));
        result = result.generalConstructionRoot;
      } else if (knackId === 31) {
        result = await bookrackAccessor.getEizenConstructionMaster();
        result = JSON.parse(JSON.stringify(result)
                      .replace(/eizenConstructionCode/g,'buildingMasterCode')
                      .replace(/eizenConstructionName/g,'buildingMasterName')
                      .replace(/eizenConstructionChildren/g,'buildingMasterChildren'));
        result = result.eizenConstructionRoot;
      } else {
        result = {
          "error": 5
        }
      }
      return result;
    } catch (ex) {
      logger.error("Failed to GetBuildingMaster", ex);
      throw ex;
    }
  }
};

module.exports = accessor;