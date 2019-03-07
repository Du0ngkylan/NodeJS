'use strict';

// 3rd-party modules.
const fse = require('fs-extra');

// GOYO modules.
const logger = require('./goyo-log')('goyo-ui-parameters');


const DEFAULT_SETTINGS = [
  { pattern: /^construction_window/,   param: { lastShowedConstructionId: 0 } },
  { pattern: /^all_bookrack_window/,   param: { windowWidth: 820, windowHeight: 640, windowX: null, windowY: null  } },
  { pattern: /^bookrack_window==\d+==\*==.*/,   param: { lastShownBookrackId: 0 } },
  { pattern: /^\*==\d+==.*==.*/,       param: { lastShowedBookrackId: 0 } },
  { pattern: /^album_view_window/,     param: { windowWidth: 850, windowHeight: 600, windowMaximize: false } },
  { pattern: /^goyo-web-information/,  param: { readList: [{info_id: 1, lastReadDate: '2018-11-06' }, {info_id: 2, lastReadDate: '2018-11-05' }, ] } },
  { pattern: /^bookrack_treeview_window_common/,  param: {displayImageSize: 's' /* 's' or 'm' or 'l' */} },
  { pattern: /^bookrack_treeview_window/,  param: { textMode : -1} },
  { pattern: /^photo_information_search_window/,  param: { logicalOperation : "or", targetIsAll : "or", chkTime : false, startDate : "", endDate : "",} },
  { pattern: /^string_search_window/,  param: { searchStrings: [], logicalOperation : "or", targetIsAll : "or", chkTime : false, startDate : "", endDate : "",} },
  { pattern: /^filename_search_window/,  param: { inputFileName: [], inputExtension: [], fileSize: {}, logicalOperation : "or", targetIsAll : "or", chkTime : false, startDate : "", endDate : "",} }
];

var uiParamFile;
var uiParam;


async function initialize(file) {
  try {
    uiParamFile = file;
    let uiParamJson = await fse.readFile(uiParamFile, {encoding: 'utf8'});
    uiParam = JSON.parse(uiParamJson);

    //logger.info('loaded uiParam:');
    //logger.info(uiParam);
    for (let key in uiParam) {
      let param = getDefaultParam(key);
      uiParam[key] = Object.assign({}, param, uiParam[key]);
    }

    //logger.debug('after interpolation:');
    //logger.debug(uiParam);
  } catch(e) {
    logger.info('Could not load uiParam file. use default.');
    uiParam = {};
  }
}

async function finalize() {
  try {
    let uiParamJson = JSON.stringify(uiParam);
    await fse.writeFile(uiParamFile, uiParamJson, {encoding: 'utf8'});
    //logger.info('store uiParam');
    //logger.info(uiParam);
  } catch(e) {
    logger.error('could not store ui-param file', e);
  }
}

function makeKey(windowName='*', constructionId='*', bookrackItemId='*', other='*') {
  return `${windowName}==${constructionId}==${bookrackItemId}==${other}`;
}

function getDefaultParam(key) {
  let setting = DEFAULT_SETTINGS.find(def => def.pattern.test(key));
  return Object.assign({}, setting.param);
}

function keyValueGetter(windowName=undefined, constructionId=undefined, bookrackItemId=undefined, other=undefined) {
  let key = makeKey(windowName, constructionId, bookrackItemId, other);
  if (!uiParam.hasOwnProperty(key)) {
    uiParam[key] = getDefaultParam(key);
  }
  return uiParam[key];
}

/*
function garbagecollection(constructionId=null) {
  if (typeof constructionId === 'number') {
    garbagecollection_for_bookrackitems(constructionId).catch(e => logger.error('garbagecollection_for_bookrackitems', e));
  } else {
    garbagecollection_for_construction().catch(e => logger.error('garbagecollection_for_construction', e));
  }
}

async function garbagecollection_for_construction() {
  let bookrackAccessor = require('sms-accessor');
  let { constructions }  = await bookrackAccessor.getConstructions();
  let constructionIds = constructions.map(c => c.constructionId);

  logger.info(`constructionIds: ${constructionIds}`);
  let removedKeys =
    Object.keys(uiParam).filter(key => {
      let [win,cid,bid,other] = key.split('==');
      return cid!=='*' && constructionIds.every(id => id!==Number(cid));
    });
  logger.info(`removedKeys: ${removedKeys}`);

  for (let key of removedKeys) {
    delete uiParam[key];
  }
}

async function garbagecollection_for_bookrackitems(constructionId) {
  let bookrackAccessor = require('sms-accessor');
  let { bookrackItems }  = await bookrackAccessor.getBookrackItems(constructionId);
  let bookrackItemIds = getItemIds(bookrackItems);

  logger.info(`bookrackItems: ${bookrackItemIds}`);
  let removedKeys =
    Object.keys(uiParam).filter(key => {
      let [win,cid,bid,other] = key.split('==');
      return Number(cid)===constructionId && bid!=='*' && bookrackItemIds.every(id => id!==Number(bid));
    });
  logger.info(`removedKeys: ${removedKeys}`);

  for (let key of removedKeys) {
    delete uiParam[key];
  }

  function getItemIds(bookrackItems) {
    let ids = [];
    for (let bookrackItem of bookrackItems) {
      ids.push(bookrackItem.bookrackItemId);
      if (bookrackItem.bookrackItems.length > 0) {
        ids.push(...getItemIds(bookrackItem.bookrackItems));
      }
    }
    return ids;
  }
}
*/

function removeUnnecessaryConstructionKeys(constructionIds) {
  logger.info(`constructionIds: ${constructionIds}`);
  let removedKeys =
    Object.keys(uiParam).filter(key => {
      let [win,cid,bid,other] = key.split('==');
      return cid!=='*' && constructionIds.every(id => id!==Number(cid));
    });
  logger.info(`removedKeys: ${removedKeys}`);

  for (let key of removedKeys) {
    delete uiParam[key];
  }
}

function removeUnnecessaryBookrackItemKeys(constructionId, bookrackItemIds) {
  logger.info(`constructionId: ${constructionId}, bookrackItems: ${bookrackItemIds}`);
  let removedKeys =
    Object.keys(uiParam).filter(key => {
      let [win,cid,bid,other] = key.split('==');
      return Number(cid)===constructionId && bid!=='*' && bookrackItemIds.every(id => id!==Number(bid));
    });
  logger.info(`removedKeys: ${removedKeys}`);

  for (let key of removedKeys) {
    delete uiParam[key];
  }
}


module.exports = keyValueGetter;
module.exports.initialize = initialize;
module.exports.finalize = finalize;
//module.exports.garbagecollection = garbagecollection;
module.exports.removeUnnecessaryConstructionKeys = removeUnnecessaryConstructionKeys;
module.exports.removeUnnecessaryBookrackItemKeys = removeUnnecessaryBookrackItemKeys;

/*
const uiParam = remote.require('./lib/goyo-ui-parameters')('album_view_window', 3, 5);
*/

