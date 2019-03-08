
const { windowHandler } = require('./goyo-window-controller');

module.exports = {

  export: async function(parent) {
    let win = await windowHandler.openViewerTargetSelectionWindow(parent);
    win.show();

    // TODO: ウィンドウ処理完了後のメッセージ表示とか
    return new Promise((resolve,reject) => {
      win.on('closed', () => {
        resolve();
      });
    });
  },

};


