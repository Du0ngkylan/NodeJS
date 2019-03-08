'use strict';

// Electron modules.
const {app} = require('electron');

// Load native-embeditor module if it exist.
try {
  var goyolib = require('./lib/goyolib');
  console.log('Use javascript file through goyolib.node in MainProcess.');
} catch(e) {
  console.log('Use javascript file through filesystem in MainProcess.');
}

// Load protocol-embeditor module if it exist.
try {
  const pembed = require('./lib/goyop');
  console.log('Use contents file through goyop.node in PrendererProcess.');
} catch(e) {
  const pembed = require('protocol-embeditor');
  pembed.runProtocolRedirection(__dirname, 'goyop');
  console.log('Use contents file through filesystem in PrendererProcess.');
}

// This is workaround
//   * for using node-adodb within asar package.
//   * for using accessor.exe in goyo-bookrack-accessor.
(function () {
  let cp = require('child_process');
  let original = cp.spawn;
  cp.spawn = function(exe,args,opt) {
    if ( typeof exe === 'string' ) {
      exe = exe.replace('.asar', '.asar.unpacked');
      if (/cscript.exe$/.test(exe) && args && args.length>1 && /app\.asar/.test(args[0])) {
        // replace first element of argument 'args' to ./resources/app.asar.unpacked/...
        // if it was called from node-adodb.
        args[0] = args[0].replace('.asar', '.asar.unpacked');
      }
    }
    return original.apply(this, [exe,args,opt]);
  }
})();


var bookrackAccessor;
var {viewMode, windowHandler} = require('./lib/goyo-window-controller');

const setTimeoutPromise = function(msec) {
  let _to;
  let _resolve;
  let p = new Promise((resolve,reject) => {
    _to = setTimeout(() => resolve(), msec);
    _resolve = resolve;
  });
  p.cancel = () => { clearTimeout(_to); _resolve(); };
  return p;
}

if (process.argv.some( e => e==='--show-debug-window' )
  || require('fs').existsSync(require('path').join('resources','for-debug'))
  || require('fs').existsSync(require('path').join('.','for-debug')) ) {
  var goyodebug = require('./test/goyodebug/goyodebug');
}

async function initialize(splash) {
  await setTimeoutPromise(1000);

  // Check application folder for goyo19.
  // If it does not exist,  create it from scrach or convert old version's application folder to it.
  let goyoAppFolder = require('./lib/goyo-appfolder');
  let appFolder = await goyoAppFolder.checkAndCreateApplicationFolder(splash);
  if (!appFolder) {
    return false;
  }

  bookrackAccessor = require('goyo-bookrack-accessor');
  bookrackAccessor.initialize(appFolder);
  bookrackAccessor
    .on('abort', e => { console.log('bookrackAccessor aborted: ', e); })
    .on('error', e => { console.log('bookrackAccessor error: ', e); } );
  app.on('quit',() => bookrackAccessor.finalize() );

  await setTimeoutPromise(1000);

  return true;
}


app.on('window-all-closed', function() { });
app.on('ready', async function() {
  try {

    // show splash and run initialize procedures in background.
    let splash = await windowHandler.openSplashWindow();
    splash.show();
    let timeoutPromise = setTimeoutPromise(2000);

    let result = await initialize(splash);
    if (!result) {
      timeoutPromise.cancel();
      app.quit();
      return;
    }

    // Wait least N msec, and open construction_window.
    await timeoutPromise;
    splash.destroy();

    viewMode.setNextMode(viewMode.MODE_CONSTRUCTION_SELECTION, {selectionMode: 'normal', defaultConstructionId: 'data'});
    await viewMode.startApplication();

    app.quit();
  } catch(e) {
    console.log('error at initialization: ', e);
  }
});


