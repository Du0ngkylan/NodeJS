'use strict'
// NodeJS modules
const util = require('util');
const exec = require('child_process').exec;

// 3rd party modules
const iconv = require('iconv-lite');

// goyo modules
const logger = require('./goyo-log')('goyo-kuraemon-drive');

class GoyoKuraemonDrive {
  constructor() {
    this.driverLists = null;
  }

  getDriverLists() {
    try {
      if (true) {
        let _cp;
        let _resolve;

        let promise = new Promise((resolve, reject) => {
          _resolve = resolve;
          _cp = exec('net view', { encoding: 'Shift_JIS' }, (err, stdout, stderr) => {
            if (err) {
              logger.error('exec(net view)', err);
              reject(err);
            } else {
              if (stderr) {
                logger.error(iconv.decode(stderr, 'Shift_JIS'));
              }
              let result = iconv.decode(stdout, 'Shift_JIS');
              logger.debug(result);
              resolve(result.match(/\\\\KRST\d-\d{8}/gm));
            }
          });
          _cp.on('error', e => logger.error('onerror', e));
        });

        return {
          resultPromise: promise,
          cancel: () => { _cp.kill(); _resolve('cancel'); },
        }
      } else {
        // This is for TEST.
        let _to;
        let _resolve;
        let promise = new Promise((resolve) => {
          _resolve = resolve;
          _to = setTimeout(() => {
            let stdout = `サーバー名 注釈
                  -------------------------------------------------------------------------------
                  \\\\ATERM-893463
                  \\\\GBA-NAS LinkStation
                  \\\\KRST1-a18072301
                  \\\\KRST1-a00000011
                  \\\\KRST1-a00000012
                  \\\\YOGI-PC yogi-pc
                  コマンドは正常に終了しました。`;
            resolve(stdout.match(/\\\\KRST\d-\d{8}/gm));
          }, 3000);
        });
        return {
          resultPromise: promise,
          cancel: () => { clearTimeout(_to); _resolve('cancel'); },
        }
      }
    } catch (error) {
      throw new Error('net view failed.');
    }

  };
}

var goyoKuraemonDrive = new GoyoKuraemonDrive();
module.exports = goyoKuraemonDrive;