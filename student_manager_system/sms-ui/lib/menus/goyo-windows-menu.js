'use strict';

// 3rd-party modules.
const fse = require('fs-extra');

// Goyo modules.
const menuActions = require('./goyo-menu-actions');
const contextMenu = require('./goyo-context-menu');
const MENU_TYPE = require('./goyo-menu-type');
const logger = require('../goyo-log')('goyo-windows-menu');


// CONSTANT VALUES.
const SEPARATOR = { type: 'separator' };
const HISTORY_LABEL_PREFIX = '[履歴] ';
const EMPTY_HISTORY = { "BOOKRACK": [], "BOOKRACK_BACK": [], "DELETED_ALBUM_BACK": [], "ALBUM_SPINE": [ ], "MULTI_ALBUM": [ ], "DELETED_ALBUM_SPINE": [ ], "CLOSED_BOX": [ ], "OPENED_BOX": [ ], "COMPARTMENT": [ ], "ALBUM_COVER": [ ], "DELETED_ALBUM": [ ], "ALBUM_CONTENTS": [ ], "ALBUM_CONTENTS_BACK": [ ], "NORMAL_FRAME": [ ], "EMPTY_FRAME": [ ], "RESERVED_FRAME": [ ], "REFERENCE_FRAME": [ ], "MULTI_FRAME": [ ], "DELETED_PHOTOS": [ ], "PHOTOVIEW": [ ], "CLIPART_EDIT": [ ] };
const menuItems = [];
menuItems[MENU_TYPE.BOOKRACK] = [
  { label: '工事情報...',                                   actionId: 'CONSTRUCTION:EDIT-INFORMATION' },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { label: '工事写真情報を検索して印刷...',                 actionId: 'SEARCH:BY-PHOTO-INFORMATION-AND-PRINT' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { label: '写真整理ツール...',                             actionId: 'SPECIAL:OPEN-SORTOUT-TOOL' },
  { label: '画像管理プログラム...',                         actionId: 'SPECIAL:OPEN-OTHER-PHOTO-MANGER' },
  { label: '禁則文字の自動変換ルール...',                   actionId: 'SPECIAL:EDIT-PROHIBIT-RULES' },
  { label: '電子納品要領変更',                              actionId: 'CONSTRUCTION:CHANGE-KNACK' },
  { label: '電子納品データ入力...',                         actionId: 'DELIVERABLE:IMPORT' },
  { type: 'separator' },
  { label: '新しいアルバムに画像を追加', submenu: [
    { label: '新しいアルバムにファイルを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FILE' },
    { label: '新しいアルバムにフォルダを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FOLDER' },
    { label: '小黒板情報付き写真を振り分けて取り込む...',   actionId: 'ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN' }, ], },
  { label: '電子小黒板入り写真を取り込み', submenu: [
    { label: '蔵衛門コネクトから取り込み...',               actionId: 'SPECIAL:IMPORT-PHOTOS-FROM-KURAEMON-CONNECT' }, ], },
  { type: 'separator' },
  { label: '本棚', submenu: [
    { label: '本棚の設定...',                               actionId: 'CONSTRUCTION:EDIT-SETTING' },
    { type: 'separator' },
    { label: 'アルバムを作成...',                           actionId: 'ALBUM:NEW' },
    { label: 'バックアップ', submenu: [
      { label: '本棚のバックアップを読み込み...',           actionId: 'BACKUP:RESTORE-CONSTRUCTION' },
      { label: '本棚のバックアップを作成...',               actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
      { label: 'データフォルダを読み込み...',               actionId: 'CONSTRUCTION:LOAD-FROM-FOLDER' }, ], },
    { label: '本棚を整理', submenu: [
      { label: 'BOXを作成してアルバムを整頓する', submenu: [
        { label: '写真区分でアルバムを整頓する...',         actionId: 'BOX:NEW-BY-PHOTO-CLASSIFICATION' },
        { label: '工種でアルバムを整頓する...',             actionId: 'BOX:NEW-BY-CONSTRUCTION-TYPE' }, ], },
      { label: 'アルバムレイアウト一括変更...',             actionId: 'ALBUM:CHANGE-LAYOUT-ALL' },
      { label: '空のアルバムを削除...',                     actionId: 'ALBUM:REMOVE-EMPTIES' }, ], }, ], },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを一括作成...',       actionId: 'BACKUP:BACKUP-ALBUMS' }, ], }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                       actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                             actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                         actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                           actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',         actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',               actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.ALBUM_SPINE] = [
  { label: '工事情報...',                                   actionId: 'CONSTRUCTION:EDIT-INFORMATION' },
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { label: '工事写真情報を検索して印刷...',                 actionId: 'SEARCH:BY-PHOTO-INFORMATION-AND-PRINT' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { label: '写真整理ツール...',                             actionId: 'SPECIAL:OPEN-SORTOUT-TOOL' },
  { label: '画像管理プログラム...',                         actionId: 'SPECIAL:OPEN-OTHER-PHOTO-MANGER' },
  { label: '禁則文字の自動変換ルール...',                   actionId: 'SPECIAL:EDIT-PROHIBIT-RULES' },
  { label: '電子納品要領変更',                              actionId: 'CONSTRUCTION:CHANGE-KNACK' },
  { label: '電子納品データ入力...',                         actionId: 'DELIVERABLE:IMPORT' },
  { type: 'separator' },
  { label: '新しいアルバムに画像を追加', submenu: [
    { label: '新しいアルバムにファイルを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FILE' },
    { label: '新しいアルバムにフォルダを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FOLDER' },
    { label: '小黒板情報付き写真を振り分けて取り込む...',   actionId: 'ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN' }, ], },
  { label: '電子小黒板入り写真を取り込み', submenu: [
    { label: '蔵衛門コネクトから取り込み...',               actionId: 'SPECIAL:IMPORT-PHOTOS-FROM-KURAEMON-CONNECT' }, ], },
  { type: 'separator' },
  { label: '本棚', submenu: [
    { label: '本棚の設定...',                               actionId: 'CONSTRUCTION:EDIT-SETTING' },
    { type: 'separator' },
    { label: 'アルバムを作成...',                           actionId: 'ALBUM:NEW' },
    { label: 'アルバムを削除',                              actionId: 'ALBUM:DELETE' },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: '本棚のバックアップを読み込み...',           actionId: 'BACKUP:RESTORE-CONSTRUCTION' },
      { label: '本棚のバックアップを作成...',               actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
      { label: 'データフォルダを読み込み...',               actionId: 'CONSTRUCTION:LOAD-FROM-FOLDER' }, ], },
    { type: 'separator' },
    { label: '本棚を整理', submenu: [
      { label: 'BOXを作成したルバムを整頓する', submenu: [
        { label: '写真区分でアルバムを整頓する...',         actionId: 'BOX:NEW-BY-PHOTO-CLASSIFICATION' },
        { label: '工種でアルバムを整頓する...',             actionId: 'BOX:NEW-BY-CONSTRUCTION-TYPE' }, ], },
      { label: 'アルバムレイアウト一括変更...',             actionId: 'ALBUM:CHANGE-LAYOUT-ALL' },
      { label: '空のアルバムを削除...',                     actionId: 'ALBUM:REMOVE-EMPTIES' }, ], }, ], },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' },
      { label: 'アルバムのバックアップを一括作成...',       actionId: 'BACKUP:BACKUP-ALBUMS' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'アルバムを整理...',                         actionId: 'ALBUM:REMOVE-EMPTY-FRAMES' },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを別の本棚に移動...',                 actionId: 'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: 'BOXを作成',                                   actionId: 'BOX:NEW' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.MULTI_ALBUM] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを別の本棚に移動...',                   actionId: 'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: 'BOXを作成',                                     actionId: 'BOX:NEW' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.DELETED_ALBUM_SPINE] = [
  { label: 'アルバムの内容を削除',                          actionId: 'ALBUM:DELETE-CONTENT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.CLOSED_BOX] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを別の本棚に移動...',                   actionId: 'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { label: 'BOX', submenu: [
    { label: 'BOXの設定',                                   actionId: 'BOX:EDIT-SETTING' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.OPENED_BOX] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを別の本棚に移動...',                   actionId: 'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { label: 'BOX', submenu: [
    { label: 'BOXの設定',                                   actionId: 'BOX:EDIT-SETTING' },
    { label: 'BOXを削除',                                   actionId: 'BOX:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.COMPARTMENT] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを別の本棚に移動...',                   actionId: 'SPECIAL:MOVE-ALBUM-TO-OTHER-BOOKRACK' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { label: '仕切りの設定...',                               actionId: 'COMPARTMENT:EDIT' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[MENU_TYPE.ALBUM_COVER] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'アルバムを整理...',                         actionId: 'ALBUM:REMOVE-EMPTY-FRAMES' },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.DELETED_ALBUM] = [
  { label: 'アルバムの内容を削除',                          actionId: 'ALBUM:DELETE-CONTENT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.ALBUM_CONTENTS] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに見開き2ページを貼り付け',   actionId: 'FRAME:EXPORT-PAGES-TO-CLIPBOARD' },
      { label: 'クリップボードから見開き2ページを取り込み', actionId: 'FRAME:IMPORT-PAGES-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'アルバムを整理...',                         actionId: 'ALBUM:REMOVE-EMPTY-FRAMES' },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.NORMAL_FRAME] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' },
    { label: '参考図ファイルを登録',                        actionId: 'FRAME:ADD-REFERENCE-FILE' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに見開き2ページを貼り付け',   actionId: 'FRAME:EXPORT-PAGES-TO-CLIPBOARD' },
      { label: 'クリップボードから見開き2ページを取り込み', actionId: 'FRAME:IMPORT-PAGES-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: '画像の活用', submenu: [
      { label: '画像を印刷...',                             actionId: 'PRINTING:PRINT-PHOTO' },
      { label: '画像情報を印刷...',                         actionId: 'PRINTING:PRINT-PHOTO-WITH-INFORMATION' },
      { label: '画像を別名で保存...',                       actionId: 'PHOTO:EXPORT' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに画像を貼り付け',            actionId: 'FRAME:EXPORT-PHOTO-TO-CLIPBOARD' },
      { label: 'クリップボードから画像を取り込み',          actionId: 'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '背表紙の縮小画像に設定',                      actionId: 'PHOTO:SET-AS-SPINE-IMAGE' },
    { label: '表紙の画像に設定',                            actionId: 'PHOTO:SET-AS-FRONTCOVER-IMAGE' },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '画像情報を文章にする...',                   actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.EMPTY_FRAME] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに見開き2ページを貼り付け',   actionId: 'FRAME:EXPORT-PAGES-TO-CLIPBOARD' },
      { label: 'クリップボードから見開き2ページを取り込み', actionId: 'FRAME:IMPORT-PAGES-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに画像を貼り付け',            actionId: 'FRAME:EXPORT-PHOTO-TO-CLIPBOARD' },
      { label: 'クリップボードから画像を取り込み',          actionId: 'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.RESERVED_FRAME] = [
  { label: '予約フレームへ画像を登録...',                   actionId: 'FRAME:ADD-PHOTO-TO-RESERVED-FRAME' },
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに見開き2ページを貼り付け',   actionId: 'FRAME:EXPORT-PAGES-TO-CLIPBOARD' },
      { label: 'クリップボードから見開き2ページを取り込み', actionId: 'FRAME:IMPORT-PAGES-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに画像を貼り付け',            actionId: 'FRAME:EXPORT-PHOTO-TO-CLIPBOARD' },
      { label: 'クリップボードから画像を取り込み',          actionId: 'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.REFERENCE_FRAME] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' },
      { type: 'separator' },
      { label: 'プレーン画像を追加...',                     actionId: 'PHOTO:NEW-FROM-PLAIN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに見開き2ページを貼り付け',   actionId: 'FRAME:EXPORT-PAGES-TO-CLIPBOARD' },
      { label: 'クリップボードから見開き2ページを取り込み', actionId: 'FRAME:IMPORT-PAGES-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'アルバムの活用', submenu: [
      { label: 'アルバム内の画像を一括保存...',             actionId: 'PHOTO:EXPORT-ALL-IN-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: 'アルバムの整理', submenu: [
      { label: '並べ替え', submenu: [
        { label: '撮影日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-SHOOTINGTIME-DESC' }, ], },
        { label: 'ファイル名', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILENAME-DESC' }, ], },
        { label: 'ファイルのサイズ', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILESIZE-DESC' }, ], },
        { label: 'ファイル日時', submenu: [
          { label: '昇順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-ASC' },
          { label: '降順',                                  actionId: 'ALBUM:SORTOUT-BY-FILETIME-DESC' }, ], }, ], },
      { label: 'アルバムを整理',                            actionId: 'ALBUM:REMOVE-EMPTY-FRAMES' },
      { label: 'ページ数を調整', submenu: [
        { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
        { label: '１冊を分けて２冊にする...',               actionId: 'ALBUM:DIVIDE' },
        { label: '２冊を合わせて１冊にする...',             actionId: 'ALBUM:COMBINE' }, ], }, ], },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { type: 'separator' },
    { label: '文章の一括入力', submenu: [
      { label: '全画像について画像情報を文章にする...',     actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '全画像について工事写真情報を文章にする...', actionId: 'FRAME:MAKE-SENTENCES-FROM-PHOTO-INFORMATION-ALL' }, ], },
    { type: 'separator' },
    { label: '削除', submenu: [
      { label: '全内容を削除',                              actionId: 'FRAME:DELETE-INFORMATIONS-ALL' },
      { label: '全文章を削除',                              actionId: 'FRAME:DELETE-SENTENCE-ALL' },
      { label: '全工事写真情報を削除',                      actionId: 'FRAME:DELETE-PHOTO-INFORMATION-ALL' }, ], }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: '画像の活用', submenu: [
      { label: '画像を印刷...',                             actionId: 'PRINTING:PRINT-PHOTO' },
      { label: '画像情報を印刷...',                         actionId: 'PRINTING:PRINT-PHOTO-WITH-INFORMATION' },
      { label: '画像を別名で保存...',                       actionId: 'PHOTO:EXPORT' }, ], },
    { type: 'separator' },
    { label: 'クリップボード', submenu: [
      { label: 'クリップボードに画像を貼り付け',            actionId: 'FRAME:EXPORT-PHOTO-TO-CLIPBOARD' },
      { label: 'クリップボードから画像を取り込み',          actionId: 'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '背表紙の縮小画像に設定',                      actionId: 'PHOTO:SET-AS-SPINE-IMAGE' },
    { label: '表紙の画像に設定',                            actionId: 'PHOTO:SET-AS-FRONTCOVER-IMAGE' },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '画像情報を文章にする...',                   actionId: 'FRAME:MAKE-SENTENCE-FROM-METADATA-ALL' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '検索', submenu: [
    { label: '工事写真情報で検索...',                        actionId: 'SEARCH:BY-PHOTO-INFORMATION' },
    { label: '文字列を検索...',                              actionId: 'SEARCH:BY-SENTENCE' },
    { label: 'ファイル名で検索...',                          actionId: 'SEARCH:BY-FILENAME' },
    { label: '同一画像を検索...',                            actionId: 'SEARCH:IDENTICAL-PHOTOS' },
    { label: '要領・基準に準拠しない画像を検索...',          actionId: 'SEARCH:MODIFIED1' },
    { label: '編集・加工された画像を検索...',                actionId: 'SEARCH:MODIFIED2' }, ], },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.MULTI_FRAME] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { label: 'クリップボードに画像を貼り付け',                actionId: 'FRAME:EXPORT-PHOTO-TO-CLIPBOARD' },
  { type: 'separator' },
  { label: 'アルバムの活用', submenu: [
    { label: '選択画像を一括保存...',                       actionId: 'PHOTO:EXRPOT-SELECTED' },
    { label: '画像を印刷...',                               actionId: 'PRINTING:PRINT-PHOTO' }, ], },
  { type: 'separator' },
  { label: '画像を削除',                                    actionId: 'FRAME:DELETE' },
  { label: '文章を削除',                                    actionId: 'FRAME:DELETE-SENTENCE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.DELETED_PHOTOS] = [
  { label: 'アルバムの内容を削除',                          actionId: 'ALBUM:DELETE-CONTENT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '画像を削除',                                    actionId: 'FRAME:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'フレームの設定...',                             actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.PHOTOVIEW] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' }, ], },
  { type: 'separator' },
  { label: '変更を保存',                                    actionId: 'PHOTOEDIT:SAVE' },
  { type: 'separator' },
  { label: '画像の設定',                                    actionId: 'FRAME:EDIT-SENTENCE' },
  { type: 'separator' },
  { label: '画像を編集', submenu: [
    { label: '画像を編集する',                              actionId: 'PHOTOEDIT:EDIT-BY-EXTERNAL-TOOLS' },
    { type: 'separator' },
    { label: '拡大・縮小...',                               actionId: 'PHOTOEDIT:SCALING' },
    { label: '切り抜き',                                    actionId: 'PHOTOEDIT:CROPPING' },
    { type: 'separator' },
    { label: 'クリップアートを追加...',                     actionId: 'PHOTOEDIT:ADD-CLIPART' },
    { type: 'separator' },
    { label: '画像を元に戻す',                              actionId: 'PHOTOEDIT:UNDO' }, ], },
  { type: 'separator' },
  { label: '画像の活用', submenu: [
    { label: '画像を印刷...',                               actionId: 'PRINTING:PRINT-PHOTO' },
    { label: '画像情報を印刷...',                           actionId: 'PRINTING:PRINT-PHOTO-WITH-INFORMATION' },
    { label: '画像を別名で保存...',                         actionId: 'PHOTO:EXPORT' }, ], },
  { type: 'separator' },
  { label: 'クリップボード', submenu: [
    { label: 'クリップボードから画像を取り込み',            actionId: 'FRAME:IMPORT-PHOTO-FROM-CLIPBOARD' }, ], },
  { type: 'separator' },
  { label: '表示の切り替え', submenu: [
    { label: '通常のウィンドウ',                            actionId: 'PHOTOVIEW:CHANGE-TO-NORMAL' },
    { label: '画像だけ表示',                                actionId: 'PHOTOVIEW:CHANGE-TO-FRAMELESS' },
    { label: '全画面に表示', submenu: [
      { label: 'サイズを自動調整して影をつける',            actionId: 'PHOTOVIEW:CHANGE-TO-FULL(AUTOSCALING)' },
      { label: '画面サイズに調整する',                      actionId: 'PHOTOVIEW:CHANGE-TO-FULL(FULLSCALING)' },
      { label: '画面全体に敷き詰める',                      actionId: 'PHOTOVIEW:CHANGE-TO-FULL(TILE)' }, ], }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[MENU_TYPE.CLIPART_EDIT] = [
  { label: '確定',                                          actionId: 'PHOTOEDIT:FIX-CLIPART' },
  { type: 'separator' },
  { label: '透明度を設定...',                               actionId: 'PHOTOEDIT:EDIT-TRANSPARENCY' },
  { label: '選択している合成画像を削除',                    actionId: 'PHOTOEDIT:CANCEL-CLIPART' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.BOOKRACK}||SIMPLE`] = [
  { label: '工事情報...',                                   actionId: 'CONSTRUCTION:EDIT-INFORMATION' },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { label: '工事写真情報を検索して印刷...',                 actionId: 'SEARCH:BY-PHOTO-INFORMATION-AND-PRINT' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { label: '写真整理ツール...',                             actionId: 'SPECIAL:OPEN-SORTOUT-TOOL' },
  { label: '画像管理プログラム...',                         actionId: 'SPECIAL:OPEN-OTHER-PHOTO-MANGER' },
  { label: '禁則文字の自動変換ルール...',                   actionId: 'SPECIAL:EDIT-PROHIBIT-RULES' },
  { label: '電子納品要領変更',                              actionId: 'CONSTRUCTION:CHANGE-KNACK' },
  { label: '電子納品データ入力...',                         actionId: 'DELIVERABLE:IMPORT' },
  { type: 'separator' },
  { label: '新しいアルバムに画像を追加', submenu: [
    { label: '新しいアルバムにファイルを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FILE' },
    { label: '新しいアルバムにフォルダを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FOLDER' },
    { label: '小黒板情報付き写真を振り分けて取り込む...',   actionId: 'ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN' }, ], },
  { label: '電子小黒板入り写真を取り込み', submenu: [
    { label: '蔵衛門コネクトから取り込み...',               actionId: 'SPECIAL:IMPORT-PHOTOS-FROM-KURAEMON-CONNECT' }, ], },
  { type: 'separator' },
  { label: '本棚', submenu: [
    { label: '本棚の設定...',                               actionId: 'CONSTRUCTION:EDIT-SETTING' },
    { type: 'separator' },
    { label: 'アルバムを作成...',                           actionId: 'ALBUM:NEW' }, ], },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを一括作成...',       actionId: 'BACKUP:BACKUP-ALBUMS' }, ], },
    { label: 'ページ数を調整...',                           actionId: '' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.ALBUM_SPINE}||SIMPLE`] = [
  { label: '工事情報...',                                   actionId: 'CONSTRUCTION:EDIT-INFORMATION' },
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { label: '工事写真情報を検索して印刷...',                 actionId: 'SEARCH:BY-PHOTO-INFORMATION-AND-PRINT' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { label: '写真整理ツール...',                             actionId: 'SPECIAL:OPEN-SORTOUT-TOOL' },
  { label: '画像管理プログラム...',                         actionId: 'SPECIAL:OPEN-OTHER-PHOTO-MANGER' },
  { label: '禁則文字の自動変換ルール...',                   actionId: 'SPECIAL:EDIT-PROHIBIT-RULES' },
  { label: '電子納品要領変更',                              actionId: 'CONSTRUCTION:CHANGE-KNACK' },
  { label: '電子納品データ入力...',                         actionId: 'DELIVERABLE:IMPORT' },
  { type: 'separator' },
  { label: '新しいアルバムに画像を追加', submenu: [
    { label: '新しいアルバムにファイルを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FILE' },
    { label: '新しいアルバムにフォルダを指定して追加...',   actionId: 'ALBUM:NEW-FROM-FOLDER' },
    { label: '小黒板情報付き写真を振り分けて取り込む...',   actionId: 'ALBUM:NEW-FROM-FILE-WITH-JACIC-KOKUBAN' }, ], },
  { label: '電子小黒板入り写真を取り込み', submenu: [
    { label: '蔵衛門コネクトから取り込み...',               actionId: 'SPECIAL:IMPORT-PHOTOS-FROM-KURAEMON-CONNECT' }, ], },
  { type: 'separator' },
  { label: '本棚', submenu: [
    { label: '本棚の設定...',                               actionId: 'CONSTRUCTION:EDIT-SETTING' },
    { type: 'separator' },
    { label: 'アルバムを作成...',                           actionId: 'ALBUM:NEW' },
    { label: 'アルバムを削除',                              actionId: 'ALBUM:DELETE' }, ], },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' },
      { label: 'アルバムのバックアップを一括作成...',       actionId: 'BACKUP:BACKUP-ALBUMS' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: 'BOXを作成',                                   actionId: 'BOX:NEW' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.MULTI_ALBUM}||SIMPLE`] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: 'BOXを作成',                                     actionId: 'BOX:NEW' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.DELETED_ALBUM_SPINE}||SIMPLE`] = [
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.CLOSED_BOX}||SIMPLE`] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.OPENED_BOX}||SIMPLE`] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { label: 'BOX', submenu: [
    { label: 'BOXを削除',                                   actionId: 'BOX:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.COMPARTMENT}||SIMPLE`] = [
  { label: 'まとめて入力', submenu: [
    { label: '工事写真情報一括登録...',                     actionId: 'EXCEL:REGISTER-PHOTO-INFORMATION' },
    { label: '写真文章一括登録...',                         actionId: 'EXCEL:REGISTER-PHOTO-SENTENCE' }, ], },
  { label: 'データ活用', submenu: [
    { label: '工事写真情報をEXCELへ出力...',                actionId: 'EXCEL:EXPORT-PHOTO-INFORMATIONS' },
    { label: '写真文章をEXCELへ出力...',                    actionId: 'EXCEL:EXPORT-PHOTO-SENTENCES' }, ], },
  { label: '電子納品データ出力...',                         actionId: 'DELIVERABLE:EXPORT' },
  { type: 'separator' },
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '工事写真台帳連続印刷...',                       actionId: 'PRINTING:PRINT-ALBUMS' },
  { type: 'separator' },
  { label: 'アルバムのバックアップを一括作成...',           actionId: 'BACKUP:BACKUP-ALBUMS' },
  { label: '本棚のバックアップを作成...',                   actionId: 'BACKUP:BACKUP-CONSTRUCTION' },
  { label: '仕切りの設定...',                               actionId: 'COMPARTMENT:EDIT' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: '工事の選択と管理...',                           actionId: 'SPECIAL:SHOW-CONSTRUCTION-LIST' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ツリービューに切り替え',                        actionId: 'SPECIAL:CHANGE-TO-TREEVIEW' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: 'プログラムを終了',                              actionId: 'SPECIAL:QUIT-PROGRAM' },
];

menuItems[`${MENU_TYPE.ALBUM_COVER}||SIMPLE`] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                           actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.DELETED_ALBUM}||SIMPLE`] = [
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.ALBUM_CONTENTS}||SIMPLE`] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.NORMAL_FRAME}||SIMPLE`] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' },
    { label: '参考図ファイルを登録',                        actionId: 'FRAME:ADD-REFERENCE-FILE' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' },
      { label: 'しおりをすべて捨てる',                      actionId: '' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: '画像の活用', submenu: [
      { label: '画像を印刷...',                             actionId: 'PRINTING:PRINT-PHOTO' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '背表紙の縮小画像に設定',                      actionId: 'PHOTO:SET-AS-SPINE-IMAGE' },
    { label: '表紙の画像に設定',                            actionId: 'PHOTO:SET-AS-FRONTCOVER-IMAGE' },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.EMPTY_FRAME}||SIMPLE`] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' },
      { label: 'しおりをすべて捨てる',                      actionId: '' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                       actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.RESERVED_FRAME}||SIMPLE`] = [
  { label: '予約フレームへ画像を登録...',                   actionId: 'FRAME:ADD-PHOTO-TO-RESERVED-FRAME' },
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' }, ], },
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' },
      { label: 'しおりをすべて捨てる',                      actionId: '' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                           actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.REFERENCE_FRAME}||SIMPLE`] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: 'アルバム', submenu: [
    { label: 'アルバムの設定...',                           actionId: 'ALBUM:EDIT-SETTING' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { type: 'separator' },
    { label: '画像を追加', submenu: [
      { label: 'ファイルを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FILE' },
      { label: 'フォルダを指定して追加...',                 actionId: 'PHOTO:NEW-FROM-FOLDER' },
      { label: '小黒板情報付き写真を追加...',               actionId: 'PHOTO:NEW-FROM-PHOTO-WITH-JACIC-KOKUBAN' }, ], },
    { type: 'separator' },
    { label: 'ページを挿入・削除', submenu: [
      { label: '見開き2ページを挿入',                       actionId: 'FRAME:INSERT-PAGES' },
      { label: '見開き2ページを削除',                       actionId: 'FRAME:DELETE-PAGES' }, ], },
    { type: 'separator' },
    { label: 'バックアップ', submenu: [
      { label: 'アルバムのバックアップを読み込み...',       actionId: 'BACKUP:RESTORE-ALBUM' },
      { label: 'アルバムのバックアップを作成...',           actionId: 'BACKUP:BACKUP-ALBUM' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' },
      { label: 'しおりをすべて捨てる',                      actionId: '' }, ], },
    { type: 'separator' },
    { label: 'ページ数を調整...',                           actionId: 'ALBUM:EDIT-PAGES' },
    { label: 'アルバムを複製',                              actionId: 'ALBUM:DUPLICATE' }, ], },
  { type: 'separator' },
  { label: 'フレーム', submenu: [
    { label: 'フレームの設定...',                           actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
    { type: 'separator' },
    { label: 'フレームを挿入・削除', submenu: [
      { label: 'フレームを挿入',                            actionId: 'FRAME:INSERT-EMPTY' },
      { label: 'フレームを削除',                            actionId: 'FRAME:DELETE' }, ], },
    { type: 'separator' },
    { label: '画像の活用', submenu: [
      { label: '画像を印刷...',                             actionId: 'PRINTING:PRINT-PHOTO' }, ], },
    { type: 'separator' },
    { label: 'しおり', submenu: [
      { label: 'このフレームにしおりを付ける...',           actionId: 'FRAME:ADD-BOOKMARK' }, ], },
    { type: 'separator' },
    { label: '背表紙の縮小画像に設定',                      actionId: 'PHOTO:SET-AS-SPINE-IMAGE' },
    { label: '表紙の画像に設定',                            actionId: 'PHOTO:SET-AS-FRONTCOVER-IMAGE' },
    { type: 'separator' },
    { label: '文章', submenu: [
      { label: '文章を編集',                                actionId: 'FRAME:EDIT-SENTENCE' },
      { label: '工事写真情報を文章にする...',               actionId: 'FRAME:MAKE-SENTENCE-FROM-PHOTO-INFORMATION' },
      { label: '文章を削除',                                actionId: 'FRAME:DELETE-SENTENCE' }, ], },
    { label: '文章を表示しない',                            actionId: 'FRAME:HIDE-SENTENCE' },
    { label: '文章を表示する',                              actionId: 'FRAME:SHOW-SENTENCE' },
    { label: '画像を削除',                                  actionId: 'FRAME:DELETE' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.MULTI_FRAME}||SIMPLE`] = [
  { label: '工事写真台帳印刷...',                           actionId: 'PRINTING:PRINT-ALBUM' },
  { type: 'separator' },
  { label: '画像を削除',                                    actionId: 'FRAME:DELETE' },
  { label: '文章を削除',                                    actionId: 'FRAME:DELETE-SENTENCE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.DELETED_PHOTOS}||SIMPLE`] = [
  { label: 'アルバムを削除',                                actionId: 'ALBUM:DELETE' },
  { type: 'separator' },
  { label: '画像を削除',                                    actionId: 'FRAME:DELETE' },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'フレームの設定...',                             actionId: 'FRAME:EDIT-FRAME-INFORMATION' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.PHOTOVIEW}||SIMPLE`] = [
  { label: '工事写真情報', submenu: [
    { label: '工事写真情報を登録',                          actionId: 'FRAME:EDIT-PHOTO-INFORMATION' },
    { label: '小黒板情報を工事写真情報に反映',              actionId: 'FRAME:MAKE-PHOTO-INFORMATION-FROM-JACIC-KOKUBAN' },
    { label: '工事写真情報を削除',                          actionId: 'FRAME:DELETE-PHOTO-INFORMATION' }, ], },
  { type: 'separator' },
  { label: '変更を保存',                                    actionId: 'PHOTOEDIT:SAVE' },
  { type: 'separator' },
  { label: '文章を編集',                                    actionId: 'FRAME:EDIT-SENTENCE' },
  { type: 'separator' },
  { label: '画像を編集', submenu: [
    { label: '画像を編集する',                              actionId: 'PHOTOEDIT:EDIT-BY-EXTERNAL-TOOLS' },
    { type: 'separator' },
    { label: '拡大・縮小...',                               actionId: 'PHOTOEDIT:SCALING' },
    { label: '切り抜き',                                    actionId: 'PHOTOEDIT:CROPPING' },
    { type: 'separator' },
    { label: 'クリップアートを追加...',                     actionId: 'PHOTOEDIT:ADD-CLIPART' },
    { type: 'separator' },
    { label: '画像を元に戻す',                              actionId: 'PHOTOEDIT:UNDO' }, ], },
  { type: 'separator' },
  { label: '画像の活用', submenu: [
    { label: '画像を印刷...',                               actionId: 'PRINTING:PRINT-PHOTO' }, ], },
  { type: 'separator' },
  { label: 'プログラム全体の設定...',                       actionId: 'SPECIAL:EDIT-PROGRAM-SETTING' },
  { type: 'separator' },
  { label: 'オンラインサービス', submenu: [
    { label: '御用達アップデート',                          actionId: 'SPECIAL:UPDATE-APPLICATION' }, ], },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

menuItems[`${MENU_TYPE.CLIPART_EDIT}||SIMPLE`] = [
  { label: '確定',                                          actionId: 'PHOTOEDIT:FIX-CLIPART' },
  { type: 'separator' },
  { label: '透明度を設定...',                               actionId: 'PHOTOEDIT:EDIT-TRANSPARENCY' },
  { label: '選択している合成画像を削除',                    actionId: 'PHOTOEDIT:CANCEL-CLIPART' },
  { type: 'separator' },
  { label: 'ヘルプ', submenu: [
    { label: 'マニュアルを表示',                            actionId: 'SPECIAL:OPEN-MANUAL' },
    { type: 'separator' },
    { label: '動作環境を確認...',                           actionId: 'SPECIAL:OPEN-ENVIRONMENT-INFORMATION' },
    { label: '著作権について...',                           actionId: 'SPECIAL:OPEN-COPYRIGHT-NOTICE' },
    { type: 'separator' },
    { label: '工事写真どっとこむ',                          actionId: 'SPECIAL:OPEN-OFFICIAL-SITE' },
    { label: '御用達サポート',                              actionId: 'SPECIAL:OPEN-SUPPORT-SITE' }, ], },
  { type: 'separator' },
  { label: '閉じる',                                        actionId: 'SPECIAL:CLOSE-WINDOW' },
];

function itemKey(type, simple) {
  if (simple) {
    return `${type}||SIMPLE`;
  } else {
    return `${type}`;
  }
}

async function updateItem(item, menuType, target) {
  switch (item.actionId) {
    case 'BOX:NEW-BY-PHOTO-CLASSIFICATION':
      {
        let construction = await target.constructionInformation;
        if (construction.knack.knackType===3) {
          item.label = '施工状況でアルバムを整頓する...';
        } else if (construction.knack.knackType===9) {
          item.label = `${construction.photoInformationTags[1]}でアルバムを整頓する...`;
        } else {
          item.label = '写真区分でアルバムを整頓する...';
        }
      }
      break;
    case 'BOX:NEW-BY-CONSTRUCTION-TYPE':
      {
        let construction = await target.constructionInformation;
        if (construction.knack.knackType===3) {
          item.label = '詳細でアルバムを整頓する...';
        } else if (construction.knack.knackType===9) {
          item.label = `${construction.photoInformationTags[2]}でアルバムを整頓する...`;
        } else {
          item.label = '工種でアルバムを整頓する...';
        }
      }
      break;
    default:
      break;
  }
}

async function updateVisibility(item, menuType, target, options) {
  if (item.submenu instanceof Array) {
    for (let child of item.submenu) {
      await updateVisibility(child, menuType, target, options);
    }
    item.visible = item.submenu.some(item => item.type!=='separator' && item.visible);
  } else if (typeof item.actionId === 'string') {
    if (item.actionId==='') {
      item.visible = true;
      item.enabled = false;
    } else {
      item.visible = await menuActions.isRunnable(item.actionId, menuType, target, options);
      await updateItem(item, menuType, target);
    }
  } else {
    item.visible = false;
  }
}

var history = EMPTY_HISTORY;
var historyFile = '';

function check(hist) {
  return Object.values(MENU_TYPE).every(type => hist[type] instanceof Array);
}

function checkAndAddHistory(type, item) {
  // check exclude condition.
  if (item.label.startsWith(HISTORY_LABEL_PREFIX)) return;
  if (!item.hasOwnProperty('actionId')) return;

  let newLabel = `${HISTORY_LABEL_PREFIX}${item.label}`;
  let idx = history[type].findIndex(i => i.label === newLabel)
  if (idx > 0) {
    history[type].splice(idx, 1);
  }

  // add menu item as latest history.
  history[type].unshift({
    label: newLabel,
    actionId: item.actionId
  });

  // history count limit.
  history[type] = history[type].slice(0, 15);
}

module.exports = {
  async initialize(file) {
    try {
      historyFile = file;
      let historyData = await fse.readFile(historyFile, {encoding: 'utf8'});
      history = JSON.parse(historyData);
      if (!check(history)) {
        history = EMPTY_HISTORY;
        logger.error('Invalid history file, use default');
      }
    } catch(e) {
      logger.info('Could not load history file. use default.');
      history = EMPTY_HISTORY;
    }
  },

  async finalize() {
    try {
      let historyData = JSON.stringify(history);
      await fse.writeFile(historyFile, historyData, {encoding: 'utf8'});
    } catch(e) {
      logger.error('could not store history file', e);
    }
  },

  async show(parentWindow, target, menuOptions) {
    let key = itemKey(menuOptions.menuType, menuOptions.simpleMenu);
    let histKey = itemKey(menuOptions.menuType, false);

    logger.debug(`maxHistory ${menuOptions.maxHistory}`);
    if (menuOptions.maxHistory > 0 && history[histKey].length > 0) {
      var mergedItem = menuItems[key].concat(SEPARATOR, history[histKey].slice(0, menuOptions.maxHistory));
    } else {
      var mergedItem = menuItems[key];
    }
    for (let item of mergedItem) {
      await updateVisibility(item, menuOptions.menuType, target, menuOptions);
    }

    let item = await contextMenu.popup(parentWindow, mergedItem);
    if (item) {
      checkAndAddHistory(menuOptions.menuType, item);
      return item.actionId;
    } else {
      return null;
    }
  }
};

