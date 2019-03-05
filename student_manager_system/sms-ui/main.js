'use strict';
const CommandLineParser = require('commander').Command;

/*
 * CAUTION
 * This module has responsibility of boot sequesce for goyo-ui.
 * And, it is for not only goyo-ui, but also CUI tools used by GOYOTASHI Connect.
 * It is bit complicated, Because it relates to the other program instance or self-relaunching.
 * PLEASE READ DESIGN DOCUMENTS BEFORE EDITING THE SOURCES.
 */

function parseCommandLine(argv) {
  // Resolve difference of command line parameters between direct executing and intermediate executing by npm.
  if (!process.defaultApp) {
    argv = [argv[0], '__DUMMY__'].concat(argv.slice(1));
  }

  const parser = new CommandLineParser;
  parser
    .version('0.2.1')
    .option('-f, --force', 'force booting goyo-ui')
    .option('-s, --show <constructionid>', 'show specified construction')
    .option('-f, --offsplash', 'not show splash window')
    .option('-e, --env', 'show pc environment')
    .option('-m, --smanager', 'show shared bookrack manager')
    .option('-c, --command <commandname>', 'run specified command')
    .option('-q, --quit', 'quit application')
    .option('-g, --goyodebug', 'show debug tool')
    .option('-u, --updatefrom <version>', 'show update message')
    .option('-t, --target <target>', 'command target');

  parser['command'] = undefined; // This is workaround for conflict of 'command' option and 'command()' method.
  return parser.parse(argv);
}

async function main() {
  const { app }  = require('electron');
  let program = parseCommandLine(process.argv);

  if (program.env) {
    require('./ui-main').showPcEnvironment(true);
    return;
  }

  if (program.smanager) {
    require('./ui-main').showSharedManager();
    return;
  }

  let isSecondInstance = app.makeSingleInstance((commandLine, workDir) => {
    let secondProgram = parseCommandLine(commandLine);

    if (secondProgram.quit || secondProgram.command) {
      require('./ui-main').quitApp();
      return;
    } else {
      if (secondProgram.show) {
        require('./ui-main').openBookrack(secondProgram.show).catch(e=>{});
      } else {
        require('./ui-main').focusMain();
      }
    }
  });
  if (isSecondInstance) {
    app.exit(0);
    return;
  }
  if (program.force) {
    require('./ui-main').startMain(program.show, program.goyodebug, program.offsplash, program.updatefrom, program.args);
    return;
  }

  if (program.command) {
    await require('./command-main').commandMain(program.command, program.target, program.args);
    app.exit(0);
    return;
  }

  if (program.quit) {
    app.exit(0);
    return;
  }

  if (!process.defaultApp) {
    app.relaunch({args: ['--force'].concat(process.argv.slice(1))});
  } else {
    app.relaunch({args: [process.argv[1], '--force'].concat(process.argv.slice(2))});
  }
  app.exit(0);
}

function doWorkarounds() {
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

  // This is workaround
  //   * for using regedit within asar package.
  (function () {
    let cp = require('child_process');
    let original = cp.execFile;
    cp.execFile = function(exe,args,opt,cb) {
      if ( typeof exe === 'string' && args instanceof Array) {
        if (/cscript.exe$/.test(exe) && args) {
          // replace first element of argument 'args' to ./resources/app.asar.unpacked/...
          // if it was called from node-adodb.
          let newArgs = args.map(arg => arg.replace('.asar', '.asar.unpacked'));
          return original.apply(this, [exe,newArgs,opt,cb]);
        }
      }
      return original.apply(this, arguments);
    }
  })();

  // This is workaround
  //   * for using JACIC dll within asar package.
  //   * for using photo-metadata-addon dll within asar package.
  (function() {
    let ffi = require('ffi');
    let original = ffi.Library;
    ffi.Library = function(dll, opt) {
      if (typeof dll === 'string') {
        dll = dll.replace('.asar', '.asar.unpacked');
      }
      return original.apply(this, [dll, opt]);
    }
  })();
}

doWorkarounds();
main().catch(e=>console.error('fatal error: ', e));

