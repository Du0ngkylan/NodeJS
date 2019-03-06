#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const fse = require('fs-extra');
const pembed = require('./index.js');
 
program
  .option('--libname <s>', 'dll name', 'pembed')
  .option('--protocol <s>', 'Protocol name', 'pembed')
  .option('--out <s>', 'Output module path', '.')
  .option('--basepath <s>', 'Contents base path', '.')
  .option('--builddir <s>', 'Temporal build directory', 'tmpbuild')
  .option('--obfuscate', 'Enable javascript obfuscation')
  .option('--contentsdir <s>', 'Directory of contents', '.')
  .option('--configuration <s>', 'configuration json file', '')
  .option('--gyp_runtime <s>', 'runtime setting for node-gyp', '')
  .option('--gyp_target <s>', 'target setting for node-gyp', '')
  .option('--gyp_disturl <s>', 'disturl setting for node-gyp', '')
  .option('--gyp_arch <s>', 'arch setting for node-gyp', '')
  .parse(process.argv);

async function listContents(dir) {
  var result = [];
  let files = await fse.readdir(dir);

  for (let file of files) {
    let filepath = path.posix.join(dir, file)
    let st = await fse.stat(filepath);
    if ( st.isDirectory() ) {
      let _files = await listContents(filepath);
      result = result.concat(_files);
    } else {
      var mime = pembed.estimateMimeType(file);
      result.push({name: filepath, mimeType: mime});
    }
  }

  return result;
}

async function main(program) {

  var npm_install_command = 'npm install';
  if (program.gyp_runtime !== '')
    npm_install_command += ` --runtime=${program.gyp_runtime}`;
  if (program.gyp_target !== '')
    npm_install_command += ` --target=${program.gyp_target}`;
  if (program.gyp_disturl !== '')
    npm_install_command += ` --disturl=${program.gyp_disturl}`;
  if (program.gyp_arch !== '')
    npm_install_command += ` --arch=${program.gyp_arch}`;
  npm_install_command +=  ' --npm_config_build_from_source=true';

  try {
    var config = {
      protocol: program.protocol,
      basePath: program.basepath,
      buildDir: path.join(process.cwd(),program.builddir),
      buildCommand: npm_install_command,
      obfuscation: true==program.obfuscate,
      files: await listContents(program.contentsdir),
    };

    //console.log(config);
    await pembed.buildNativeModule(config);

    fse.copy(
      path.join(config.buildDir,'build/Release/pembed.node'),
      path.join(program.out, program.libname+'.node'));
  } catch(e) {
    console.log('Building native module failed: ' + e);
  }
}

main(program);

