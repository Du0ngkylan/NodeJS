
// Node.js modules.
// Electron modules.
const { dialog } = require('electron');

// Goyo modules.
const { windowHandler } = require('./goyo-window-controller');
const bookrackAccessor = require('sms-accessor');
const goyoDialog = require('./goyo-dialog-utils');


module.exports = {

  dumpBookrack: async function(parent, bookrackId) {
  },

  restoreBookrack: async function(parent, bookrackId) {
  },


  dumpAlbums: async function(parent, bookrackId, albumId) {
    const filters=[ {name: 'images', extensions: ['jpg','png','gif']},
                 {name: 'Movies', extensions: ['mkv','avi','mp4']},
                 {name: 'Cusyom File Type', extensions: ['as']}];

    if (albumId) {
      // TODO: GOYO用のsaveダイアログに置き換え
      let save = await goyoDialog.showSaveFileSelectionDialog(parent, 'saveダイアログ', 'C:\\', filters);
    } else {

      let result = await goyoDialog.showAlbumBackupDialog(parent, bookrackId);
      if (result==='OK') {

        // TODO: GOYO用のopen folderダイアログに置き換え
        let folder = await goyoDialog.showFolderSelectionDialog(parent, 'folderダイアログ', 'C:\\', filters, false);
        if (folder) {
          // バックアップ処理実行
          // TODO: 実処理未実装。今はメッセージ表示のみ
          await goyoDialog.showSimpleMessageDialog(parent, 'バックアップテスト', `フォルダ${folder}が選択されました`, 'OK');
        } else {
          // TODO: 実処理未実装。今はメッセージ表示のみ
          await goyoDialog.showSimpleMessageDialog(parent, 'バックアップテスト', `キャンセルされました`, 'OK');
        }
      }
    }
  },

  restoreAlbums: async function(parent) {
    // TODO: GOYO用のopen fileダイアログで実装
  },

};


