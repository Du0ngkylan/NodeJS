'use strict';

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('get-constructions');

var constructionsMaster = {
  getConstructionsMaster: async function(knackId) {
    try {
      let {knacks} = await bookrackAccessor.getKnacks();
      let knackType = await this.getKnackType(knacks, knackId);
      if (!knackType) {
        logger.error(new Error("KnackType is not found!!!"));
        return {constructionTypes: [], errorMessage: 'KnackType is not found', error : 5};
      }
      let constructionsMaster = await bookrackAccessor.getConstructionTypeMaster(knackId, knackType);
      return constructionsMaster;
    } catch (ex) {
      logger.error("Failed to GetConstructionsMaster", ex);
      throw ex;
    }
  },
  getKnackType: async function(knacks, knackId) {
    for (const knack of knacks) {
      if(knack.knackId === knackId) {
        return knack.knackType;
      }
    }
  }
};

module.exports = constructionsMaster;