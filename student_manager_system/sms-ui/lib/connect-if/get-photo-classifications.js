'use strict';
const bookrackAccessor = require('sms-accessor');
const logger = require('../goyo-log')('get-photo-classifications');
var accessor = {
  getPhotoClassifications: async function (knackId) {
    try {
      let respone = await bookrackAccessor.getPhotoClassifications(knackId);
      return respone.constructionRoot;
    } catch (ex) {
      logger.error("Failed to GetPhotoClassifications", ex);
      throw ex;
    }
  }
}
module.exports = accessor;