'use strict';

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('get-constructions');
const common = require('./connect-if-util');

var accessor = {
  ACCEPTED_FIELD: [
    'constructionId', 'year', 'constructionNumber', 'constructionName',
    'startDate', 'endDate', 'contractee', 'contracteeCode', 'contracteeName',
    'largeCategory', 'middleCategory', 'smallCategory', 'contractor',
    'contractorCode', 'contractorName', 'knack', 'knackId', 'knackName',
    'dataFolder'
  ],
  getConstructions: async function() {
    try {
      let constructions = await bookrackAccessor.getConstructions();
      constructions.constructions = common.filterProperty(
          constructions.constructions, this.ACCEPTED_FIELD);
      return {constructions: constructions.constructions, errorMessage: ''};
    } catch (ex) {
      logger.error("Failed to getConstructions", ex);
      throw ex;
    }
  }
};

module.exports = accessor;