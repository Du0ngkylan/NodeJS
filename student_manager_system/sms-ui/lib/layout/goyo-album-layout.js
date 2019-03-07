'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 3rd-party modules.
const fse = require('fs-extra');

// goyo modules.
const goyoAppFolder = require('../goyo-appfolder');

module.exports = {
  LAYOUT_TYPE_STANDARD: 'standard',
  LAYOUT_TYPE_OTHER: 'other',
  LAYOUT_TYPE_ORDERMADE: 'ordermade'
}
