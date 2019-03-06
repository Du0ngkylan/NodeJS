'use strict';

// Node.js modules.
const path = require('path');

// 3rd-party modules.
const fse = require('fs-extra');

// settings
const SETTINGS_NAME = "settings.json";

// connect registry keys
const TEST_PAD_CONNECT_KEY = 'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{C459EFE3-377C-4CF8-9B58-EFA1AE4B69CD}_is1';
const PROD_PAD_CONNECT_KEY = 'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{4CB906F0-1A57-4A64-A53B-22E1662B2169}_is1';
const TEST_KBAN_CONNECT_KEY = 'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{01E21D4D-7C5C-4A66-A9B8-C84730856FEF}_is1';
const PROD_KBAN_CONNECT_KEY = 'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{C6B9D811-01BC-4EA5-A326-5DF2C2BAC7C2}_is1';

const TEST_KEYS = [
  TEST_PAD_CONNECT_KEY, TEST_KBAN_CONNECT_KEY
];

const PROD_KEYS = [
  PROD_PAD_CONNECT_KEY, PROD_KBAN_CONNECT_KEY
];

// endpoints
const TEST_URL = 'https://d2ugsy00pn9jki.cloudfront.net/';
const PROD_URL = 'https://api.kuraemon.net/'; // DO NOT USE IT NOW!
// mode TODO: final release -> product (set true)
// current -> develop
const FORCE_PRODUCT = false;
const MODE_PROD = "product";
const DEFAULT_SETTINGS = {
  mode: MODE_PROD,
};

// module member
let appEnv = {
  "connectKey": PROD_KEYS,
  "endPoint": PROD_URL,
  "settings": DEFAULT_SETTINGS,
};

// private function

async function readSettings(filepath) {  
  let s = {
    connectKey: PROD_KEYS,
    endPoint: PROD_URL,
    settings: {},
  };

  let settings = DEFAULT_SETTINGS;
  try {
    let contents = await fse.readFile(filepath, 'utf8');
    settings = JSON.parse(contents);
  } catch(e) {
    // use default
    settings = DEFAULT_SETTINGS;
  }

  if (settings.hasOwnProperty('mode') && settings.mode !== MODE_PROD) {
    s = {
      connectKey: TEST_KEYS,
      endPoint: TEST_URL,
    };
  }

  s.settings = settings;
  return s;
}


module.exports = {
  async initialize(basedir) {
    let settingsPath = path.join(
      basedir,
      SETTINGS_NAME
    );
  
    if (!FORCE_PRODUCT) {
      Object.assign(appEnv, await readSettings(settingsPath));
    }
  },
  appEnv : appEnv
};

