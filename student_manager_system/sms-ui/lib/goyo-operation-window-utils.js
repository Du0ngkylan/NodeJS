'use strict';

const EventEmitter = require('events');
const { BrowserWindow } = require('electron');
const windowHandler = require('./window-controller/window-handler');

function TestFunc() {
  console.log('operation-window: click menu item');
}

const DEFAULT_MENUITEM = {
  "input:deliverable": [
    {label: '電子納品データ入力', click() { TestFunc(); }}, ],
  "input:newalbum": [
    {label: 'アルバムを作成...', click() { TestFunc(); }}, ],
  "input:photofiles": [
    {label: '新しいアルバムにファイルを指定して追加...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '新しいアルバムにフォルダを指定して追加...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '小黒板情報付き写真を振り分けて取込む....', click() { TestFunc(); }}, ],
  "input:backup": [
    {label: 'アルバムのバックアップを読み込む...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '本棚のバックアップを読み込む...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: 'データフォルダを読み込む...', click() { TestFunc(); }}, ],
  "output:viewer": [
    {label: 'ビューワ出力...', click() { TestFunc(); }}, ],
  "output:print": [
    {label: '工事写真台帳連続印刷...', click() { TestFunc(); }}, ],
  "output:backup": [
    {label: 'アルバムのバックアップを一括作成...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '本棚のバックアップを作成...', click() { TestFunc(); }}, ],
  "output:excel": [
    {label: '工事写真情報をEXCELへ出力...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '写真文章をEXCELへ出力...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '工事写真一覧をEXCELへ出力...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '工事写真台帳の表紙をEXCELで作成...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '工事写真登録状況をEXCELへ出力...', click() { TestFunc(); }}, ],
  "output:photoCheck": [
    {label: '同一画像を検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '編集・加工された画像を検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '工事写真登録状況をEXCELへ出力...', click() { TestFunc(); }}, ],
  "other:settingOrganizing": [
    {label: "Boxを作成してアルバムを整頓する",
      submenu: [
        {label: '写真区分でアルバムを整頓する...', click() { TestFunc(); }},
        {label: '工種でアルバムを整頓する...', click() { TestFunc(); }} ] },
    {type: 'separator'},
    {label: 'アルバムレイアウトを一括変更...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '空のアルバムを削除',  click() { TestFunc(); }}, ],
  "other:construction": [
    {label: '工事情報...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '写真整理ツール...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '画像管理プログラム...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '禁則文字の自動変換ツール...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '電信納品要領変更', click() { TestFunc(); }}, ],
  "other:togetherInput": [
    {label: '工事写真情報一括登録....', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '写真文章一括登録...', click() { TestFunc(); }}, ],
  "other:searchImage": [
    {label: '工事写真情報で検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '文字列を検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: 'ファイル名で検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '同一画像を検索...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '編集・加工された画像を検索...', click() { TestFunc(); }}, ],
  "other:collaboration": [
    {label: '写真振り分け情報作成(TG-5)', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '写真振り分け情報作成(TG-3/TG-1)', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '写真をフォルダに振り分け', click() { TestFunc(); }}, ],
  "other:onlineService": [
    {label: '御用達アップデート', click() { TestFunc(); }}, ],
  "other:help": [
    {label: 'マニュアルを表示', click() { TestFunc(); }},
    {type: 'separator'},
    {label: 'バージョン情報...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '動作環境を確認...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '著作権について...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '工事写真どっとこむ', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '御用達サポート', click() { TestFunc(); }}, ],
  "other:close": [
    {label: 'プログラムを終了', click() { TestFunc(); }}, ],
  "option": [
    {label: '工事の選択と管理...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: 'プログラムの全体設定...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: '本棚の設定...', click() { TestFunc(); }},
    {type: 'separator'},
    {label: 'ツリービューに切り替え...', click() { TestFunc(); }}, ],
};


class OperationWindowUtil extends EventEmitter {

  constructor() {
    super();
    this.window = null;
    this.currentMenuItems = null;
    this.currentMenuTitles = null;
  }

  // called from MainProcess.
  setDefault() {
    this.currentMenuItems = DEFAULT_MENUITEM;
    this.currentMenuTitles = { 
      "TitleWindow":"○本棚の操作", "TitleInput":"○本棚への入力",
      "TitleOutput":"○本棚からの出力", "OtherTitle":"○その他の操作" };
  }

  // called from parent window.
  open(menuTitles, menuItems) {
    return new Promise(async (resolve,reject) => {
      this.currentMenuTitles = menuTitles;
      this.currentMenuItems = menuItems;
      this.window = await windowHandler.openOperationWindow();
      this.window.on('blur', () => { this.window.destroy(); });
      this.window.on('closed', () => { this.window = null; resolve(); });
      this.window.show();
    });
  }
  
  close() {
    this.window.destroy();
  }

  // called from sub window.
  get menuItems() {
    return this.currentMenuItems;
  }
  get menuTitles() {
    return this.currentMenuTitles;
  }
};

var operationWindowUtil = new OperationWindowUtil();
operationWindowUtil.setDefault();

module.exports = operationWindowUtil;

