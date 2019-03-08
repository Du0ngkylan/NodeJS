'use strict';

// Node.js modules.
const writeFile = require('fs').writeFile;

// Electron modules.

// Goyo modules.
const goyoDialog = require('./goyo-dialog-utils');
const { plainImageMaker } = require('./goyo-utils');

module.exports = {

  addPhotoFromFile: async function(parent, bookrackId) {
  },

  addPhotoFromFolder: async function(parent, bookrackId) {
  },

  addPhotoWithBlackboardInformation: async function(parent, bookrackId) {
  },

  addPlainImage: async function(parent, bookrackId) {
    try {
      let {okOrCancel, image} = await goyoDialog.showPlainImageCreatingDialog(parent);

      image = {
        width: 480,
        height: 320,
        color: {r:255, g:127, b:200}
      };

      if (true || okOrCancel==='OK') {
        let png =
          plainImageMaker
          .make(image.width, image.height, image.color.r, image.color.g, image.b, 1)
          .toPNG({scaleFactor:1.0});

        // TODO: TEMPフォルダに書き出しor直接bookrack-accessorに渡す？
        return new Promise((resolve,reject) => {
          writeFile('testdata.png', png, () => {
            resolve();
          });
        });
      }
    } catch(e) {
      console.log('addPlainImage error: ', e);
    }
  },

};


