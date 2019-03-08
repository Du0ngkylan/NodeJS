
const { windowHandler } = require('./goyo-window-controller');

module.exports = {

  import: async function(parent) {
    let win = await windowHandler.openDeliverableDataInputWindow(parent);
    win.show();

    // TODO: ウィンドウ処理完了後のメッセージ表示とか
    return new Promise((resolve,reject) => {
      win.on('closed', () => {
        resolve();
      });
    });
  },

  export: async function(parent, bookrackId, albumId) {
    let win = await windowHandler.openDeliverableDataOutputWindow(parent);
    win.show();

    // TODO: ウィンドウ処理完了後のメッセージ表示とか
    return new Promise((resolve,reject) => {
      win.on('closed', () => {
        resolve();
      });
    });
  },

};


