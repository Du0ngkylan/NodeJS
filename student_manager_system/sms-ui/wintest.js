'use strict';

var {app, BrowserWindow} = require('electron');

const pembed = require('protocol-embeditor');
pembed.runProtocolRedirection(__dirname, 'goyop');

let goyoAppFolder = require('./lib/goyo-appfolder');
var bookrackAccessor = require('goyo-bookrack-accessor');
bookrackAccessor.initialize(goyoAppFolder.getAppFolder());

app.on('quit', function() {
  bookrackAccessor.finalize();
});

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function() {
  if (process.argv.length>2 && process.argv[2]==='dialog') {
    let win = new BrowserWindow({width: 800, height: 800, show: false});
    win.loadURL('file://'+__dirname+'/test/dialogshowtest/dialogshow.html');
    win.on('ready-to-show', function() {
      win.show();
    });
  } else {
    let win = new BrowserWindow({width: 600, height: 800, show: false});
    win.loadURL('file://'+__dirname+'/test/windowshowtest/winshow.html');
    win.on('ready-to-show', function() {
      win.show();
    });
  }
});



