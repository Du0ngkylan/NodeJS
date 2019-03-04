'use strict';

// Node.js modules.
const spawn = require('child_process').spawn;
const path = require('path');


function test() {
  var process = spawn(
    path.join(__dirname, '\\build\\Release\\goyo-db-manager-test.exe'));

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
    
  process.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
};

test();