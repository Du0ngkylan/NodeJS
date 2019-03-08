
// Node.js modules.
const path = require('path');

// Electron modules.
const { app } = require('electron');

// 3rd-parth modules.
const fse = require('fs-extra');

// Goyo modules.
const converter = require('goyo-bookrack-converter');
const goyoDialog = require('./goyo-dialog-utils');
const { windowHandler } = require('./goyo-window-controller');


const GOYO18_APP_FOLDER = path.join(
  app.getPath('appData'),
  'NEC Solution Innovators',
  'GASUKE',
  'C00PROGRA~20GOYO18',
);

const GOYO19_APP_FOLDER = path.join(
  app.getPath('appData'),
  'Lecre',
  'KURAEMON',
  'GOYO2019',
);

const INITIAL_BOOKRACK = path.join(
  __dirname,
  '..',
  'resources',
  'initialbookrack'
);


module.exports = {
  getAppFolder: function() {
    return GOYO19_APP_FOLDER;
  },

  checkAndCreateApplicationFolder: async function(parent) {

    if (await fse.pathExists(GOYO19_APP_FOLDER)) {
      return GOYO19_APP_FOLDER;
    }

    if (await fse.pathExists(GOYO18_APP_FOLDER)) {
      let message =
        '御用達18以前のデータが見つかりました。このデータを本バージョン用に変換して利用しますか？\n' +
        '（変換した場合も元のデータフォルダはそのまま残ります）';

      let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent, 'データ変換確認', message, 'はい(&Y)', 'いいえ(&N)', true);
      if (result) {

        let messageWindow = await windowHandler.openSimpleMessageWindow(parent, "データ変換", "旧バージョンの御用達データフォルダを変換しています..");
        messageWindow.show();

        await fse.copy(GOYO18_APP_FOLDER, GOYO19_APP_FOLDER);
        let result = await converter.convert(GOYO19_APP_FOLDER);

        if (result.errors && result.errors.length>0) {
          console.log('convert error: ', result.errors);
          await goyoDialog.showSimpleMessageDialog(parent, '変換エラー', '以下のエラーが発生しました\n'+JSON.stringify(result.errors,null,2), 'OK');
        }
        console.log(result.converted);
        messageWindow.destroy();
        return GOYO19_APP_FOLDER;
      }
    }

    let message = 
      '御用達19のデータフォルダがありません。\n新規に作成しますか？\n'+
      'いいえを選択するとアプリケーションを終了します。';
    let result = await goyoDialog.showSimpleBinaryQuestionDialog(parent, '新規データフォルダ作成確認', message, 'はい(&Y)', 'いいえ(&N)', true);
    if (result) {
      await fse.mkdirp(path.dirname(GOYO19_APP_FOLDER));
      await fse.copy(INITIAL_BOOKRACK, GOYO19_APP_FOLDER);
      return GOYO19_APP_FOLDER;
    } else {
      return null;
    }
  },
};


