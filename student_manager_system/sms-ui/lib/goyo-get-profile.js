'use strict';

// GOYO modules.
const bookrackAccessor = require('sms-accessor');

async function _getSelectData(KeyName){
  let selectData = [];
  try {
    if (["contractorCodes", "contractorNames"].indexOf(KeyName) > -1) {
      selectData = await bookrackAccessor.getUserContractor();
    } else {
      selectData = await bookrackAccessor.getUserContractee();
    }
  } catch (e) {
    console.log(e);
  }
  return selectData[KeyName];
}

module.exports = {
  getOrdererCodeSelectData: async function() {
    return await _getSelectData("contracteeCodes");
  },
  getOrdererLargeSelectData: async function() {
    return await _getSelectData("largeCategorys");
  },
  getOrdererMediumSelectData: async function() {
    return await _getSelectData("middleCategorys");
  },
  getOrdererSmallSelectData: async function() {
    return await _getSelectData("smalleCategorys");
  },
  getOrdererOfficeNameData: async function(){
    return await _getSelectData("contracteeNames");
  },
  getContractorNameSelectData: async function() {
    return await _getSelectData("contractorNames");
  },
  getContractorCodeSelectData: async function() {
    return await _getSelectData("contractorCodes");
  },
  getContracteeNameSelectData: async function() {
    return await _getSelectData("contracteeNames");
  }
};
