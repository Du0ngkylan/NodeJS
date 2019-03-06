'use strict';

// Node.js modules.
const path = require('path');
const fs = require('fs');

// 3rd-party modules.
const fse = require('fs-extra');

// Goyo modules.
const { goyoCopy } = require('./goyo-utils');

// Internal variables.
var basePath;
var counter = 0;


function makeUniqueName(filepath) {
  return `${counter++}-${path.basename(filepath)}`;
}


module.exports = {
  async initialize(basedir) {
    basePath = basedir;
    await fse.ensureDir(basePath);
    await this.clearAllTemporals();
  },
  
  async finalize() {
    await fse.remove(basePath);
  },

  makeTemporalPathFromFileName(fileName) {
    let temporalPath = path.join(basePath, fileName);
    return temporalPath;
  },

  async makeTemporal(filepath) {
    let temporalPath = path.join(basePath, makeUniqueName(filepath));
    // Because Elenctron not support fs.copyFile() for asar package,  both fs.copyFile() and fse.copy are not usable.
    // instead of them, use original copyFile();
    //await fse.copy(filepath, temporalPath);
    await goyoCopy(filepath, temporalPath);
    return temporalPath;
  },

  async isManaging(temporalPath) {
    try {
      if (path.dirname(temporalPath) === basePath) {
        return await fse.exists(temporalPath);
      } else {
        return false;
      }
    } catch(e) {
      return false;
    }
  },

  async clearTemporal(temporalPath) {
    try {
      if (await this.isManaging(temporalPath)) {
        await fse.remove(temporalPath);
      }
    } catch(e) {
      logger.error(`could not remove temporal path: ${temporalPath}`, e);
    }
  },

  async clearAllTemporals() {
    let files = await fse.readdir(basePath);
    for (let file of files) {
      await fse.remove(path.join(basePath, file));
    }
  },
};

