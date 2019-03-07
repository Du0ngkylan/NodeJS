const goyoRequire = (function () {
  const path = require('path');
  const { remote } = require('electron');
  const goyoRoot =  remote.require('./lib/goyo-utils').goyoRootDir();
  const logger = remote.require('./lib/goyo-log')('goyolib-require');
  var goyolib = null;

  try {
    goyolib = require(path.join(goyoRoot, 'lib', 'goyolib-renderer'));
    goyolib.on('load', filename=> {
      remote.require('./lib/goyo-log')('goyolib-renderer').info(`loaded: ${filename}`);
    });
    logger.info('goyolib-renderer OK');
  } catch(e) {
    logger.info('goyolib-renderer NG');
  }

  return function goyoRequire(modpath) {
    if (goyolib == null) {
      return require(path.join(goyoRoot, modpath));
    } else {
      return require(modpath);
    }
  }
})();
