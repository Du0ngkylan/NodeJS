'use strict';

// Node.js modules.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Electron modules.
const { shell, nativeImage, BrowserWindow } = require('electron');

//goyo-modules
// const photoMetadataAcessor = require('photo-metadata-accessor');
// 3rd-party modules.
const fse = require('fs-extra');

// Global variables;
var shell32 = null;

// module fucntion or object.

const shellopen = function(parent, filePath, mode=shellopen.OPEN) {
  const ffi = require('ffi');
  const wchar_t = require('ref-wchar');
  if (shell32 == null) {
    shell32 = ffi.Library('shell32', {
      'ShellExecuteW': ['int', ['int', wchar_t.string, wchar_t.string, wchar_t.string, wchar_t.string, 'int']],
    });
  }
  let nativeParent = parent ? parent.getNativeWindowHandle().readInt32LE() : null;
  let result = shell32.ShellExecuteW(
    nativeParent,
    mode,
    path.resolve(filePath),
    null,
    null,
    1
  );
  if (result > 32) {
    return true;
  } else {
    return false;
  }
};
shellopen.OPEN = 'open';
shellopen.EDIT = 'edit';
shellopen.PRINT = 'print';
shellopen.EXPLORER = 'explorer';


var plainImageMaker = {
  make(width, height, r, g, b, a) {
    return nativeImage
      .createFromBuffer(Buffer.from([b,g,r,a]), {width:1,height:1})
      .resize({width: width, height: height});
  }
};

var htmlOpener = {
  openManual() {
    let manualPath;
    let registryAccessor = require('./license/goyo-registry-accessor');
    registryAccessor.loadInstallPath().then(p => {
      if (!p) {
        throw 'no install';
      }
      manualPath = path.resolve(path.join(p, '..', 'doc', 'index.html'));
      return fse.exists(manualPath);
    }).then(exists => {
      if (exists) {
        shell.openItem(manualPath);
      } else {
        throw 'no manual';
      }
    }).catch(e => {
      const goyoDialog = require('./goyo-dialog-utils');
      return goyoDialog.showErrorMessageDialog(null,
        "エラー", "マニュアルがインストールされていません。", "OK");
    });
  },

  openSupportSite() {
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=support&t=${Date.now()}`);
  },

  openGoyotashiSite() {
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=koujishashin&t=${Date.now()}`);
  },

  openKuraemonDriveSite() {
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=drive&t=${Date.now()}`);
  },

  openConnectSite() {
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=connect&t=${Date.now()}`);
  },

  openAlbumOrdermadeSite() {
    const { appEnv } = require('./goyo-app-env');
    const licenseManager = require('./license/goyo-license-manager');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=ordermade&license_key=${licenseManager.licenseKey}&t=${Date.now()}`);
  },

  openKuraemonOnlinePasswordRequest(email) {
    let query = '';
    if (email) {
      query = `?email=${encodeURIComponent(email)}`;
    }
    shell.openItem(`https://secure.kuraemon.com/shop/password.php${query}`);
  },

  openLicenseRestictionRedirectPage(type) {
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=${type}&t=${Date.now()}`);
  },

  openPrivacypolicy(){
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=privacypolicy&t=${Date.now()}`);
  },

  openDownload(){
    const { appEnv } = require('./goyo-app-env');
    shell.openItem(`${appEnv.endPoint}redirect/goyo/?type=download&t=${Date.now()}`);
  }
};

var directoryWalk = async function(firstDir, extensions, level=5) {

  var collectImageFiles = function(dir, filelist, recursive) {
    let files = fse.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      let isDir = false;
      try {
        if (fse.statSync(path.join(dir, file)).isDirectory()) {
          if (recursive < level) {
            filelist = collectImageFiles(path.join(dir, file), filelist, recursive + 1);
          }
        } else {
          let ext = path.extname(file);
          extensions.some(se => {
            if (se === ext.toLowerCase()) {
              filelist.push(path.join(dir, file));
              return true;
            }
          });
        }
      } catch(e) {
      }
    });
    return filelist;
  };

  return collectImageFiles(firstDir, [], 0);
};

function goyoRootDir() {
  return path.dirname(__dirname);
}

/****************************************************************/
/* file copy fucntions                                          */
/* These three functions can be used for files in asar package. */
/****************************************************************/
function goyoCopyFile(srcFile, destFile) {
  return new Promise((resolve, reject) => {
    let reader = fs.createReadStream(srcFile);
    let writer = fs.createWriteStream(destFile);
    reader.on('end', () => {
      writer.end();
      resolve();
    });
    reader.on('error', e => {
      writer.end();
      reject(e);
    });
    writer.on('error', e => {
      reader.end();
      reject(e);
    });
    reader.pipe(writer, { end: false });
  });
}
async function goyoCopyDir(srcDir, destDir) {
  await fse.ensureDir(destDir);
  let files = await fse.readdir(srcDir);

  for (let file of files) {
    await goyoCopy(path.join(srcDir, file), path.join(destDir, file));
  }
}
async function goyoCopy(src, dest) {
  let s = await fse.stat(src);
  if (s.isDirectory()) {
    await goyoCopyDir(src, dest);
  } else {
    await goyoCopyFile(src, dest);
  }
}

const isSpecifiedExtension = function(fileName, ext =[]) {
  let lower = fileName.toLowerCase();
  for (let e of ext) {
    if (lower.endsWith(e)) {
      return true;
    }
  }
  return false;
}

function holdWindowsStop(windows=null) {
  const sendDisableMessage = 'disable-window';
  const sendEnableMessage  = 'enable-window'
  windows = getAllWindow(windows);
  windowsIpcSend(windows,sendDisableMessage,(win)=>win.setEnabled(false));

  return {
    release() {
      windowsIpcSend(windows,sendEnableMessage,(win)=>win.setEnabled(true));
    }
  };
}

function waitEffect(win=null){
  const sendWaitMessage = 'disableWaitEffect';
  const sendRevertMessage = 'enableWaitEffect';
  let targetWindow = win || BrowserWindow.getFocusedWindow();
  if(!targetWindow.isDestroyed()){
    targetWindow.send(sendWaitMessage);
  }
  
  return {
    release() {
      if(!targetWindow.isDestroyed()){
        targetWindow.send(sendRevertMessage);
      }
    }
  };
}

async function imgOrienToAddExif(orientation,targetFile) {
  let orientationValue = convertOrientationToExifInfo(orientation);
  let orientationTag = 'Orientation';
  if(!orientationValue){
    return null
  }
  // await photoMetadataAcessor.setExifValue(orientationTag,orientationValue,targetFile)
}

module.exports = {
  plainImageMaker,
  htmlOpener,
  directoryWalk,
  shellopen,
  goyoCopy,
  goyoCopyFile,
  goyoRootDir,
  isSpecifiedExtension,
  holdWindowsStop,
  waitEffect,
  imgOrienToAddExif
  // imgOrienToAddExifPermitError:photoMetadataAcessor.SET_EXIF_ERROR_MESSAGES
};

function getAllWindow(windows=null) {
  if (windows==null) {
    return windows = BrowserWindow.getAllWindows();
  } else if (!Array.isArray(windows)) {
    return windows = [windows];
  }
  return windows;
}
function windowsIpcSend(windows = [],message = '',callback = (win)=>{}){
  if(message === ''){
    return
  }
  for (let win of windows) {
    if (!win.isDestroyed()) {
        win.send(message);
        callback(win);
    }
  }
}

function convertOrientationToExifInfo(orientation = {flip: '', rotate: ''}) {
  let flip = orientation.flip;
  let rotate = orientation.rotate;
  let exifInfo = '';
  if(flip === 'true' && rotate === '0'){
    exifInfo = 'Mirror horizontal';
  }else if(flip === 'false' && rotate  === '180'){
    exifInfo = 'Rotate 180';//'180度回転'
  }else if(flip === 'true' && rotate  === '180'){
    exifInfo = 'Mirror vertical';
  }else if(flip === 'true' && rotate  === '270'){
    exifInfo ='Mirror horizontal and rotate 270 CW';
  }else if(flip === 'false' && rotate  === '90'){
    exifInfo ='Rotate 90 CW';//90度回転 CW
  }else if(flip === 'true'  && rotate  === '90'){
    exifInfo ='Mirror horizontal and rotate 90 CW';
  }else if(flip === 'false'  && rotate === '270'){
    exifInfo ='Rotate 270 CW'//'270度回転 CW'
  }
  return exifInfo;
}