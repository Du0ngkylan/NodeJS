'use strict';
// Node.js Electron modules.
const url = require('url');
const path = require('path');
const { app } = require('electron');
var logger;
var smsAccessor;

const CONSTRUCTION_BKS_EXT = ".bksx";

//app.commandLine.appendSwitch('js-flags', '--expose-gc');

/*
 * CAUTION
 * No require any js files in ./goyo-ui/lib/ here.
 * When you execute packaged goyo-ui,  these modules cannot be accessed from
 * this point.
 *
 * If you want to add initialization procedure for these module, add the code
 * after loading 'goyolib' in initialize().
 */

var timestamp = {
  _s: null,
  _b: 0,
  start() { this._s = Date.now() },
  get current() { return Date.now() - this._s; },
  log(name) {
    //let now = this.current;
    //let diff = now - this._b;
    //console.log(`TIMESTAMP: ${String(now).padStart(5,' ')}, ${('+'+String(diff)).padStart(6,' ')} -- ${name}`);
    //this._b = now;
  },
};

global.eval = () => {
  setTimeout(() => app.quit(), 1000);
  throw new Error('not use eval. because of source obfuscation.');
}

async function setTimeoutPromise(msec) {
  let _to;
  let _resolve;
  let p = new Promise((resolve,reject) => {
    _to = setTimeout(() => resolve(), msec);
    _resolve = resolve;
  });
  p.cancel = () => { clearTimeout(_to); _resolve(); };
  return p;
}

async function initialize() {
  timestamp.log('initialize begin');

  timestamp.log('loading goyolib');
  // Load native-embeditor module if it exist.
  try {
    let _logger=null;
    let goyolib = require('./lib/goyolib');
    goyolib.on('load', filename=> {
      if (!_logger) _logger = require('./lib/goyo-log')('goyolib');
      _logger.debug(`embedded module loaded: ${filename}`);
    });
    console.log('Use javascript file through goyolib.node in MainProcess.');
  } catch(e) {
    console.log('Use javascript file through filesystem in MainProcess.');
  }

  timestamp.log('loading goyop');
  // Load protocol-embeditor module if it exist.
  try {
    const pembed = require('./lib/goyop');
    console.log('Use contents file through goyop.node in PrendererProcess.');
  } catch(e) {
    const pembed = require('protocol-embeditor');
    pembed.runProtocolRedirection(__dirname, 'goyop');
    console.log('Use contents file through filesystem in PrendererProcess.');
  }

  timestamp.log('loading goyo-appfolder');
  // Check application folder for goyo19.
  // If it does not exist,  create it from scrach or convert old version's application folder to it.
  let goyoAppFolder = require('./lib/goyo-appfolder');
  const isExistsGoyoAppFolder = await goyoAppFolder.isExsitsApplicationFolder();
  let appFolder = await goyoAppFolder.checkAndCreateApplicationFolder(isExistsGoyoAppFolder);
  if (!appFolder) {
    return false;
  }

  timestamp.log('loading goyo-app-env');
  await require('./lib/goyo-app-env').initialize(appFolder);

  timestamp.log('loading goyo-log');
  // load logger module.
  require('./lib/goyo-log').logDir = path.join(appFolder, 'logs');
  require('./lib/goyo-log').outputConsoleEnabled = true;
  logger = require('./lib/goyo-log')('ui-main');
  logger.info(`goyo-ui started at ${new Date()}`);

  // In order to initialize 'net' module of electron as fast as possible, it calls checking accessible.
  let goyoWebApi = require('./lib/goyo-web-api');
  goyoWebApi.webApiIsAccessible().then(r => logger.debug(`webApiIsAccessible: ${r}`));

  process.on('unhandledRejection', (reason, p) => {
    p.catch(e => {
      logger.error(`Unhandled rejection at: , reason: ${reason}`, e);
    });
  });
  process.on('uncaughtException', (exception) => {
    logger.error(`UncaughtException`, exception);
  });

  // register custom protocol
  // Note:When supporting tif, customize it for use
  //await require('./lib/goyo-image-protocol-handler').initialize();

  timestamp.log('initialize goyo-font-manager');
  // initialize font-manager.
  var goyoFontManager = require('./lib/goyo-font-manager');
  goyoFontManager.readAvailableFonts().catch(e => logger.error('readAvailableFonts', e));
  logger.info('goyo-font-manager initialized');

  timestamp.log('initialize sms-accessor');
  // initialize bookrack-accessor.
  smsAccessor = require('sms-accessor');
  const { appEnv } = require('./lib/goyo-app-env');
  let accessorLogLevel = smsAccessor.getLogLevel(appEnv, 'bookrack_accessor');
  logger.info(`bookrack_accessor.logLevel=${accessorLogLevel}`);
  smsAccessor.initialize(appFolder, accessorLogLevel);
  smsAccessor
    .on('abort', e => { logger.abort('smsAccessor aborted', e); require('./lib/goyo-window-controller').viewMode.closeCurrentModeWindow(); })
    .on('error', e => { logger.error('smsAccessor emitted error', e); } );
  logger.info(`sms-accessor was initialized.`);

  timestamp.log('initialize goyo-program-settings');
  // const programSettings = require('./lib/goyo-program-settings');
  // await programSettings.initialize();

  timestamp.log('initialize goyo-temporal');
  await require('./lib/goyo-temporal').initialize(path.join(appFolder, 'tempfiles'));

  timestamp.log('initialize goyo-kinsoku');
  let goyoKinsoku = require('./lib/goyo-kinsoku');
  goyoKinsoku.initialize(appFolder);
  require('./lib/menus/goyo-menu-sheet-items');

  timestamp.log('checking sample construction');
  if(!isExistsGoyoAppFolder){
    await makeSampleConstruction(appFolder,smsAccessor,logger);
  }

  timestamp.log('initialize goyo-windows-menu');
  await require('./lib/menus/goyo-windows-menu').initialize(path.join(appFolder, 'menu-history.json'))

  // timestamp.log('initialize goyo-album-operation');
  // await require('./lib/goyo-album-operation').initialize();

  timestamp.log('initialize goyo-ui-parameters');
  await require('./lib/goyo-ui-parameters').initialize(path.join(appFolder, 'ui-param.json'));

  timestamp.log('initialize goyo-goyozip');
  await require('./lib/goyo-goyozip-protocol-handler').initialize();

  logger.debug(JSON.stringify(require('./lib/goyo-app-env').appEnv, null, 2));

  logger.info('initialize procedure completed.');
  timestamp.log('initialize end');
  return true;
}

async function asyncInitialize() {

  // Do initialize after waiting for first window opening.
  await setTimeoutPromise(5000);

  try {
    let list = await require('./lib/layout/goyo-album-ordermade').downloadTemplates()
    logger.info(`downloaded ${JSON.stringify(list,null,2)}`);
  } catch(e) {
    logger.error('download ordermade layout failed', e);
  }

    //.then(() => require('./lib/layout/goyo-album-layout').updateLayouts('ordermade'))
    //.then(r => logger.info('updating ordermade layout successful.'))
    //.catch(e => logger.error('updateLayouts error', e));
}

async function finalize() {
  logger.info('finalizing..');
  await require('./lib/goyo-web-information').finalize();
  await require('./lib/goyo-goyozip-protocol-handler').finalize();
  await require('./lib/menus/goyo-windows-menu').finalize();
  await require('./lib/goyo-temporal').finalize();
  // Note:When supporting tif, customize it for use
  //await require('./lib/goyo-image-protocol-handler').finalize();
  await require('./lib/goyo-ui-parameters').finalize();

  await require('./lib/lock-manager/goyo-lock-manager').waitConstructionUnLockAll();
  // Note[FAILSAFE]: In order to process the final request, smsAccessor finishes a few seconds later
  await setTimeoutPromise(2000);
  await smsAccessor.finalize();
}

async function determineShowTarget(showTarget) {

  let result = null;
  if (showTarget != null) {
    //result = Number(showTarget);
    let [ constructionId, bookrackId ] = showTarget.split('/');

    result = {
      constructionId: Number(constructionId),
      bookrackId: Number(bookrackId),
    };
  } 
  // else {
  //   let { programSettings } = await smsAccessor.getProgramSettings();
  //   if (programSettings.otherSettings.firstBookrack===1) {
  //     const uiParam = require('./lib/goyo-ui-parameters')('construction_window');
  //     if (uiParam.lastShowedConstructionId != null) {
  //       result = { constructionId: uiParam.lastShowedConstructionId, bookrackId: null};
  //       logger.debug(`lastShowedConstructionId: ${uiParam.lastShowedConstructionId}`);
  //     }
  //   }
  // }

  // Check if the target construction can be shown.
  if (result != null) {
    try {
      logger.debug(`result: ${result}`);
      const { construction } = await smsAccessor.getConstructionDetail(result.constructionId, false);
      if (construction.knack.knackName!=='要領不明') {
        return result;
      }
    } catch(e) {
      logger.error('could not get construction information', e);
    }
  }

  return null;
}

function startMain(showTarget, useGoyoDebugWindow = true, offsplash, updatefrom, args) {
  timestamp.start();
  // if (!offsplash) openSplash();

  app.on('window-all-closed', function() { });

  app.on('ready', async function() {
    timestamp.log('electron ready');
    try {
      //let timeoutPromise = setTimeoutPromise(3000);
      let result = await initialize();
      if (!result) {
        //timeoutPromise.cancel();
        app.quit();
        return;
      }

      if (useGoyoDebugWindow) {
        timestamp.log('start goyodebug');
        try {
          var goyodebug = require('./goyodebug/goyodebug');
        } catch(e) {
          // do nothing.
        }
      }
      const goyoDialog = require('./lib/goyo-dialog-utils');
      const goyoAppDefaults = require('./lib/goyo-app-defaults');

      if (isRestoreMode(args)) {
        // if (!offsplash) closeSplash();
        await goyoDialog.showErrorMessageDialog(null, 'エラー', 
          'BKSXファイルを直接開くことはできません。\n蔵衛門御用達を起動して、メニュー「本棚のバックアップを読み込み」から読みこんでください。', 'OK');
        return;
      }

      timestamp.log('wait intialize minimum time.');
      // Wait least N msec, and close splash window.
      //await timeoutPromise;
      
      timestamp.log('install path check');
      //check install path
      const { appEnv } = require('./lib/goyo-app-env');
      const goyoRegistryAccessor = require('./lib/license/goyo-registry-accessor');
      const TRUE_DIR = await goyoRegistryAccessor.loadInstallPath();
      const appStartPath  = path.resolve(__dirname,'../../');
      const isStartExeTrueDir = TRUE_DIR === appStartPath; 
      if(appEnv.settings.hasOwnProperty('disableInstallPathCheck') 
          && appEnv.settings['disableInstallPathCheck']){
        logger.info(`install path check skipped.`);
      }else{
        if(!isStartExeTrueDir){
          logger.error(`failed install path check:\nappStartPath:${appStartPath}\nregistoryPath:${TRUE_DIR}`)
          if (!offsplash) closeSplash();
          const displayMessage = 'インストール先のフォルダの場所が変更されています。\n元の場所に戻すか、ソフトを再インストールしてください。'
          await goyoDialog.showErrorMessageDialog(null,goyoAppDefaults.DIALOG_TITLE,displayMessage,'OK');
          return;
        }
      }

      timestamp.log('license check');
      const licenseManager = require('./lib/license/goyo-license-manager');
      // let checkResult = await licenseManager.checkLicenseWithErrorDialog();
      // if (!offsplash) closeSplash();
      // if (!checkResult) {
      //   if (!await licenseManager.registerLicense()) {
      //     return;
      //   }
      // }
      // if (licenseManager.licenseType === 'trial') {
      //   let remainingTime = licenseManager.remainingTime;

      //   if (0 < remainingTime) {
      //     let option = { remainingDays: Math.floor(remainingTime/(60*60*24)) };
      //     await goyoDialog.showLicenseRestrictionDialog(null, 1, option);
      //   } else {
      //     await goyoDialog.showLicenseRestrictionDialog(null, 2);
      //     return;
      //   }
      // }

      const goyoWebInfo = require('./lib/goyo-web-information');
      let webInfoInitPromise = goyoWebInfo.initialize();

      //timestamp.log('update check');
      //const goyoUpdate = require('./lib/goyo-update');
      //let chkUpdate = await goyoUpdate.checking();
      //if (chkUpdate && chkUpdate.code && chkUpdate.code === 201) {
      //  let result = await goyoDialog.showSimpleBinaryQuestionDialog(
      //    null, goyoAppDefaults.DIALOG_TITLE,
      //    '御用達2020のアップデートが見つかりました。ダウンロードしますか？',
      //    'はい(&Y)', 'いいえ(&N)', false);
      //  if (result) {
      //    let updateResult = await goyoUpdate.updating(chkUpdate, null);
      //    if (updateResult) {
      //      return;
      //    }
      //  }
      //}

      timestamp.log('set host information to backend');
      initializeHostInfo(smsAccessor, licenseManager);

      let {viewMode} = require('./lib/goyo-window-controller');
      //logger.debug("args=" + JSON.stringify(args, null, 2));

      timestamp.log('target window determination');

      if ( showTarget == null ) {
        if (updatefrom && updatefrom != goyoAppDefaults.VERSION) {
          let goyoDialog = require('./lib/goyo-dialog-utils');
          await goyoDialog.showSimpleMessageDialog(
            null,
            goyoAppDefaults.DIALOG_TITLE,
            'アップデートが完了しました。',
            'OK');              
        }

        timestamp.log('goyo-web-information open');
        // await webInfoInitPromise;
        await goyoWebInfo.openUnreadInfomationList();
      }

      // Check the first showing construction is set or not.
      let target = await determineShowTarget(showTarget);
      if (target != null) {
        viewMode.setNextMode(viewMode.MODE_BOOKRACK_VIEW, target);
      } else {
        viewMode.setNextMode(viewMode.MODE_CONSTRUCTION_SELECTION, {selectionMode: 'normal', defaultConstructionId: 'data'});
      }  

      timestamp.log('start asyncInitialize()');
      asyncInitialize().then(() => {}).catch(e => {});

      logger.info(`application type: ${require('./lib/goyo-app-defaults').APPLICATION_TYPE}`);
      timestamp.log('start startApplication()');
      await viewMode.startApplication();
    } catch(e) {
      console.error(e);
    } finally {
      await finalize();
      logger.info(`exits at ${new Date()}.`);
      app.quit();
    }
  });
}

function focusMain() {
  let {viewMode} = require('./lib/goyo-window-controller');
  viewMode.focusCurrentModeWindow();
}

async function openBookrack(showTarget) {
  let {viewMode} = require('./lib/goyo-window-controller');
  let target = await determineShowTarget(showTarget);
  if (target) {
    viewMode.setNextMode(viewMode.MODE_BOOKRACK_VIEW, target);
    viewMode.closeCurrentModeWindow();
  }
}

function quitApp() {
  let {viewMode} = require('./lib/goyo-window-controller');
  if (viewMode.mainWindowHandle) {
    viewMode.setNextMode(null);
    viewMode.closeCurrentModeWindow();
  } else {
    app.exit();
  }
}

function showPcEnvironment(isEnvStartUp) {
  app.on('window-all-closed', function() { });
  app.on('ready', async function() {
    let appFolder = null;
    try {
      // Load native-embeditor module if it exist.
      try {
        var goyolib = require('./lib/goyolib');
        goyolib.on('load', filename=> {
          require('./lib/goyo-log')('goyolib').info(`embedded module loaded: ${filename}`);
        });
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

      let fse = require('fs-extra');
      // Check application folder for goyo19.
      // If it does not exist,  create it from scrach or convert old version's application folder to it.
      appFolder = await require('./lib/goyo-appfolder').getAppFolder();
      if (!await fse.exists(appFolder)) {
        appFolder = null;
      }

      process.on('unhandledRejection', (reason, p) => {
        p.catch(e => {
          logger.error(`Unhandled rejection at: , reason: ${reason}`, e);
        });
      });
      process.on('uncaughtException', (exception) => {
        logger.error(`UncaughtException`, exception);
      });

      // load logger module.
      if (appFolder) {
        await require('./lib/goyo-app-env').initialize(appFolder);
        require('./lib/goyo-log').logDir = path.join(appFolder, 'logs');
      }
      require('./lib/goyo-log').outputConsoleEnabled = true;
      logger = require('./lib/goyo-log')('ui-main(pcenv)');
      logger.info(`goyo-ui started at ${new Date()}`);


      // initialize bookrack-accessor.
      if (appFolder) {
        smsAccessor = require('sms-accessor');
        const { appEnv } = require('./lib/goyo-app-env');
        let accessorLogLevel = smsAccessor.getLogLevel(appEnv, 'bookrack_accessor');
        logger.info(`bookrack_accessor.logLevel=${accessorLogLevel}`);
        smsAccessor.initialize(appFolder, accessorLogLevel);
        smsAccessor
          .on('abort', e => { logger.abort('smsAccessor aborted', e); require('./lib/goyo-window-controller').viewMode.closeCurrentModeWindow(); })
          .on('error', e => { logger.error('smsAccessor emitted error', e); } );
        logger.info(`sms-accessor was initialized.`);
      }

      let license = null;
      const licenseManager = require('./lib/license/goyo-license-manager');
      const goyoAppDefaults = require('./lib/goyo-app-defaults');
      if (await licenseManager.checkLicense()) {
        license = {
          name: licenseManager.licenseTypeName,
          key: licenseManager.licenseKey,
          pcid: licenseManager.deviceId,
          appdata: appFolder,
        };
      }

      let bootGoyo = false;
      let uiEnv = require('goyo-ui-env');
      await uiEnv.open(
        null,
        goyoAppDefaults.PRODUCT_NAME,
        goyoAppDefaults.VERSION,
        license,
        (license && licenseManager.licenseType==='standard') ? showLicenseWindow : null,
        appFolder!=null,
        isEnvStartUp,
      );

      if (bootGoyo) {
        if (!process.defaultApp) {
          app.relaunch({args: ['--force']});
        } else {
          app.relaunch({args: [process.argv[1], '--force']});
        }
      }

      async function showLicenseWindow(parent) {
        parent.hide();
        try {
          if (await licenseManager.registerLicense(parent)) {
            bootGoyo = true;
            return true;
          }
        } catch(e) {
          logger.error('showLicenseWindow', e);
        }
        parent.showInactive();
        return false;
      }
    } catch(e) {
      console.error(e);
    } finally {
      if (appFolder) {
        await smsAccessor.finalize();
      }
      logger.info(`exits at ${new Date()}.`);
      app.quit();
    }
  });
}

function showSharedManager() {
  app.on('ready', async function () {
    let appFolder = null;
    try {
      // Load protocol-embeditor module if it exist.
      try {
        const pembed = require('./lib/goyop');
        console.log('Use contents file through goyop.node in PrendererProcess.');
      } catch(e) {
        const pembed = require('protocol-embeditor');
        pembed.runProtocolRedirection(__dirname, 'goyop');
        console.log('Use contents file through filesystem in PrendererProcess.');
      }

      // Load native-embeditor module if it exist.
      try {
        var goyolib = require('./lib/goyolib');
        goyolib.on('load', filename=> {
          require('./lib/goyo-log')('goyolib').info(`embedded module loaded: ${filename}`);
        });
        console.log('Use javascript file through goyolib.node in MainProcess.');
      } catch(e) {
        console.log('Use javascript file through filesystem in MainProcess.');
      }

      let fse = require('fs-extra');
      // Check application folder for goyo19.
      // If it does not exist,  create it from scrach or convert old version's application folder to it.
      appFolder = await require('./lib/goyo-appfolder').getAppFolder();
      if (!await fse.exists(appFolder)) {
        appFolder = null;
      }
      
      process.on('unhandledRejection', (reason, p) => {
        logger.error(`Unhandled rejection at: ${p.toString()}, reason: ${reason}`);
      });
      process.on('uncaughtException', (exception) => {
        logger.error(`UncaughtException`, exception);
      });

      // load logger module.
      if (appFolder) {
        await require('./lib/goyo-app-env').initialize(appFolder);
        require('./lib/goyo-log').logDir = path.join(appFolder, 'logs');
      }
      require('./lib/goyo-log').outputConsoleEnabled = true;
      logger = require('./lib/goyo-log')('ui-main(smanager)');
      logger.info(`goyo-ui started at ${new Date()}`);
      
      // initialize bookrack-accessor.
      if (appFolder) {
        smsAccessor = require('sms-accessor');
        const { appEnv } = require('./lib/goyo-app-env');
        let accessorLogLevel = smsAccessor.getLogLevel(appEnv, 'bookrack_accessor');
        logger.info(`bookrack_accessor.logLevel=${accessorLogLevel}`);
        smsAccessor.initialize(appFolder, accessorLogLevel);
        smsAccessor
          .on('abort', e => { logger.abort('smsAccessor aborted', e); require('./lib/goyo-window-controller').viewMode.closeCurrentModeWindow(); })
          .on('error', e => { logger.error('smsAccessor emitted error', e); } );
        logger.info(`sms-accessor was initialized.`);
      }
      
      let win = null;
      let goyoDialog = require('./lib/goyo-dialog-utils');
      const licenseManager = require('./lib/license/goyo-license-manager');
      let licenseCheck = await licenseManager.checkLicense();
      if (!licenseCheck) {
        await goyoDialog.showWarningMessageDialog(
          null, 'エラー',
          "御用達のライセンス登録が済んでいません。Professionalライセンス登録後に起動してください。",
          'OK');
        return;
      }
      if (licenseManager.licenseType && licenseManager.licenseType === 'trial') {
        await goyoDialog.showLicenseRestrictionDialog(null, 9);
        return;
      } else if (licenseManager.licenseType === 'standard') {
        await goyoDialog.showLicenseRestrictionDialog(null, 13);
        return;
      } else {
        const hostName = require("./lib/goyo-utils").getHostName();
        let serialNumber = licenseManager.licenseKey;
        smsAccessor.setSerialNumber(serialNumber);
        smsAccessor.setHostName(hostName);
        smsAccessor.setAppVersion(require('./lib/goyo-app-defaults').VERSION);
        let text = '本機能は、\n\n';
        text += '　　システム障害などにより共有している本棚に利用中の情報が\n';
        text += '　　残ってしまった。\n';
        text += '　　共有したまま再インストールした結果、共有できなくなってしまった。\n\n';
        text += 'などの場合に利用してください。\n\n';
        text += '正常にご利用されている状態で、不用意に共有情報を変更し、そのまま\n';
        text += '使い続けるとデータが破壊されるおそれがあります。';
        await goyoDialog.showWarningMessageDialog(null, '警告',text,'OK');
        win = require('goyo-ui-share').openShareWindow(null);
        await new Promise(r => {
          win.on('close', r);
        });
      }
    } catch(e) {
      console.log(e);
    } finally {
      if (appFolder) {
        await smsAccessor.finalize();
      }
      logger.info(`exits at ${new Date()}.`);
      app.quit();
    }
  });
}

function isRestoreMode(args) {
  if (args.length == 0) {
    return false;
  }
  let file = args[0].toLowerCase();
  let ext = path.extname(file);
  return (ext == CONSTRUCTION_BKS_EXT);
}

function openSplash() {
  let startupPath;
  if (require('fs').existsSync(path.join(process.cwd(), 'startup'))) {
    startupPath = path.join(process.cwd(), 'startup');
  } else {
    startupPath = path.join(path.dirname(process.argv[0]), 'startup');
  }

  require('goyo-splash').open(
    path.join(startupPath,'kuraemon_icon.ico'),
    path.join(startupPath,'splash.bmp'));
}
function closeSplash() {
  require('goyo-splash').close();
}

function initializeHostInfo(smsAccessor, licenseManager) {
  const APP_VERSION = 123; //require('./lib/goyo-app-defaults').VERSION;
  const hostName = "PC";//require("./lib/goyo-utils").getHostName();
  const serialNumber = 123456; //licenseManager.licenseKey;
  smsAccessor.setSerialNumber(serialNumber);
  smsAccessor.setHostName(hostName);
  smsAccessor.setAppVersion(APP_VERSION);

  logger.debug('hostName:' + hostName);
  logger.debug('serialNumber:' + serialNumber);
  logger.debug('appVersion:' + APP_VERSION);
}

async function makeSampleConstruction(appFolder,smsAccessor,logger){
  // const goyoResources = require('goyo-resources');
  // const goyoUtil = require('./lib/goyo-utils');
  // const sampleConstructionData = goyoResources.getSampleConstruction();
  // const makeSampleConstructionPath = await smsAccessor.getNewConstructionFolder(appFolder);
  // try {
  //   await goyoUtil.goyoCopy(sampleConstructionData,makeSampleConstructionPath);
  //   await smsAccessor.importConstruction(makeSampleConstructionPath,false,false,0,true);
  // } catch (error) {
  //   logger.error('make sample construction',error);
  // }
}

module.exports = {
  startMain,
  focusMain,
  openBookrack,
  quitApp,
  showPcEnvironment,
  showSharedManager
};
