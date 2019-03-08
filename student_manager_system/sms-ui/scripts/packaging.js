'use strict';

const packager = require('electron-packager');
const exec = require('util').promisify(require('child_process').exec);
const { remove, rename } = require('fs-extra');

const TARGET_VERSION = '1.8.4';
const TARGET_ARCH = (process.argv.length>2)
  ? process.argv[2]
  : 'x64';

const PACKAGE_CONFIG = {
  name: 'GOYO19',
  dir: ".",
  out: "./out",
  icon: "./contents/common/images/exeicon.ico",
  platform: "win32",
  arch: TARGET_ARCH,
  version: TARGET_VERSION,
  overwrite: true,
  asar: {
    unpackDir: '**/{node-adodb,goyo-bookrack-accessor}',
    //unpackDir: '**/{node-adodb,sqlite3}',
  },
  win32metadata: {
    CompanyName: 'SALTYSTER.Inc',
    FileDescription: '蔵衛門御用達 2019',
    //OrigianlFilename: 'originalfilename',
    ProductName: '蔵衛門御用達',
    //InternalName: 'internalName',
  },
  afterExtract: [ callback_log('afterExtract') ],
  afterPrune: [ callback_log('afterPrune') ],
  afterCopy: [ callback_log('afterCopy'),
    async (buildPath, electronVersion, platform, arch, callback) => {
      try {

        // Build goyop.node, the module containing files in ./contents dir.
        await exec(`protocol-embeditor --libname=goyop --protocol=goyop --out ./${buildPath}/lib --contentsdir ./contents --builddir _build/goyop_${arch} --gyp_runtime=electron --gyp_arch=${arch} --gyp_target=${TARGET_VERSION} --gyp_disturl=https://atom.io/download/atom-shell`);

        // Build goyolib.node, the module containing js files.
        await exec(`native-embeditor --obfuscate --name=goyolib --out ./${buildPath}/lib --contentsdir ./lib --packages goyo-bookrack-accessor --builddir _build/goyolib_${arch} --gyp_runtime=electron --gyp_arch=${arch} --gyp_target=${TARGET_VERSION} --gyp_disturl=https://atom.io/download/atom-shell`);
        callback();
      } catch(e) {
        console.log('error:', e);
        callback(e);
      }
    }
  ],
  ignore: [
    '/_build',
    '/scripts',
    '/logs',
    //'/test',
    '/wintest.js',
    '/contents/common',
    new RegExp('/build/Release/obj'),
    new RegExp('^/lib/.*.js'),
    new RegExp('^/contents/.*[wW]indow'),
    new RegExp('^/node_modules/goyo-bookrack-accessor/\(sources\|include\|build\|lib\|.*.js\|binding.gyp\)'),
  ]

}

function callback_log(type) {
  return (buildPath, electronVersion, platform, arch, callback) => {
    console.log(`${type}: buildPath:${buildPath} electronVersion:${electronVersion}, platform:${platform}, arch:${arch}`);
    //console.log(await readdir(`${buildPath}/node_modules/goyo-bookrack-accessor`));
    callback();
  };
}

async function main() {

  try {
    // rebuild goyo-bookrack-accessor for ia32 if this environment is x64.
    if (process.arch==='x64' && TARGET_ARCH==='ia32') {
      await exec(`npm install --arch=ia32 goyo-bookrack-accessor`)
    }

    let appPaths = await packager(PACKAGE_CONFIG);
    let newname = appPaths[0]
      .replace('-ia32', '(32bit)')
      .replace('-x64', '(64bit)')

    await remove(newname);
    await rename(appPaths[0], newname);
    console.log("package was created into ", newname);

    // restore goyo-bookrack-accessor for x64.
    if (process.arch==='x64' && TARGET_ARCH==='ia32') {
      await exec(`npm install --arch=x64 goyo-bookrack-accessor`)
    }
  } catch(e) {
    console.log('error: ', e);
  }

}

main();

