'use strict'

const fontManager = require('font-manager');
const logger = require('./goyo-log')('goyo-font-manager');

class GoyoFontManager {
  constructor() {
    this.fonts = {};
    this.fontStyles = null;
    this.fontDoms = null;
    this.cssAllofFonts = null;
    this.fontValues = [];
  }

  async readAvailableFonts() {
    let fonts = await new Promise((resolve,reject) => {
      fontManager.getAvailableFonts(fonts => {
        if (Array.isArray(fonts)) {
          resolve(fonts);
        } else {
          resolve([]);
        }
      });
    });

    let fontStyles = new Map();
    let optionDoms = '';
    let cssAllofFonts = '';
    let fontValue = [];
    for (let i = 0; i < fonts.length; i++) {
      if (fontStyles.has(fonts[i].family)) {
        fontStyles.get(fonts[i].family).push(fonts[i].style);
      } else {
        fontStyles.set(fonts[i].family, [fonts[i].style]);
        fontValue.push(fonts[i].postscriptName);
        optionDoms += '<option value="' + fonts[i].postscriptName + '" style="font-family: '+ fonts[i].family +'">' + fonts[i].family + '</option>';
        cssAllofFonts += '.ql-font-' + fonts[i].postscriptName + ' {font-family: "'+ fonts[i].family +'";} \n';
        cssAllofFonts += '#toolbar-container .ql-font span[data-label="'+ fonts[i].family +'"]::before {font-family: "'+ fonts[i].family +'";} \n';
      }
    }
    this.fonts = fonts;
    this.fontStyles = fontStyles;
    this.fontDoms = optionDoms;
    this.fontValues = fontValue;
    this.cssAllofFonts = cssAllofFonts;
    logger.info('Font loading completed');
  }

  getFonts() {
    return this.fonts;
  }

  getAllFontStylesData() {
    return this.fontStyles;
  }

  getFontDoms() {
    return this.fontDoms;
  }

  getCssAllofFonts() {
    return this.cssAllofFonts;
  }

  getFontValues() {
    return this.fontValues;
  }
}

var goyoFontManager = new GoyoFontManager();
module.exports = goyoFontManager;