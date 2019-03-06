
const path = require('path');
const util = require('util');
const fse = require('fs-extra');

const NOT_FOUND = 'request not found.';

const DEFAULT_OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: false,
  disableConsoleOutput: false,
  domainLock: [],
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  reservedNames: [],
  rotateStringArray: true,
  seed: 1,
  selfDefending: false,
  sourceMap: false,
  sourceMapBaseUrl: '',
  sourceMapFileName: '',
  sourceMapMode: 'separate',
  stringArray: true,
  stringArrayEncoding: 'base64',
  stringArrayThreshold: 0.75,
  target: 'node',
  unicodeEscapeSequence: false
};

const DEFAULT_CONFIG = {
  protocol: 'embedded',
  basePath: '.',
  buildDir: __dirname+'/tmp',
  buildCommand: 'npm install',
  obfuscation: false,
  obfuscation_options: DEFAULT_OBFUSCATION_OPTIONS,
  files: [
  ],
};

DEFAULT_MIMETYPES = {
  '.js':   'application/javascript',
  '.html': 'text/html',
  '.css':  'text/css',
  '.jpg':  'image/jpg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.bmp':  'image/bmp',
  'default': 'application/octet-stream',
};

function applyDefaultConfig(config) {
  var result = Object.assign({}, config);
  if (!result.hasOwnProperty('protocol'))
    result.protocol = DEFAULT_CONFIG.protocol;
  if (!result.hasOwnProperty('basePath'))
    result.basePath = DEFAULT_CONFIG.basePath;
  if (!result.hasOwnProperty('buildDir'))
    result.buildDir = DEFAULT_CONFIG.buildDir;
  if (!result.hasOwnProperty('buildCommand'))
    result.buildCommand = DEFAULT_CONFIG.buildCommand;
  if (!result.hasOwnProperty('obfuscation'))
    result.obfuscation = DEFAULT_CONFIG.obfuscation;
  if (!result.hasOwnProperty('files'))
    result.files = DEFAULT_CONFIG.files;
  if (result.obfuscation && !result.hasOwnProperty('obfuscation_options'))
    result.obfuscation_options = DEFAULT_CONFIG.obfuscation_options;
  return result;
}

function convertToCString(raw) {
  var result = [];
  for (const b of raw) {
    result.push(`0x${b.toString(16)}`);
  }
  if (result.length===0) return "0x00";
  else return result.join(',');
}


function jsObfuscation(config, raw) {
  const obfuscator = require('javascript-obfuscator');
  var text = raw.toString('utf8');

  var result = obfuscator.obfuscate(text, config.obfuscation_options);
  return Buffer.from(result.getObfuscatedCode());
}


async function makeDefinitionFile(config, outDir) {
  var outContents = [];
  var counter = 0;
  var idList = [];

  for (const file of config.files) {
    console.log(`pembed: embed "${file.name}"`);
    let ext = path.extname(file.name);
    let mime = file.mimeType;
    let raw = await fse.readFile(path.join(config.basePath,file.name));
    if ( ext==='.js' && config.obfuscation && file.name.indexOf('/vendor/')===-1 ) {
      raw = jsObfuscation(config, raw);
    }
    let data = convertToCString(raw);
    let length = raw.length;

    //outContents.push(`DEF(__pe_${counter++}, "/${file.name}", "${mime}", ${length}, ${data})`);
    let id = `__pe_${counter++}`
    outContents.push(`DEF(${id}, "/${file.name}", "${mime}", ${length})`);
    data = `const char ${id}[] = {  ${data} };`;
    await fse.writeFile(path.join(outDir,id+'.c'), data);
    idList.push(id);
  }

  await fse.writeFile(path.join(outDir,'contents.def'), outContents.join('\n'));
  return idList;
}


function estimateMimeType(filename) {
  var ext = path.extname(filename);
  if (DEFAULT_MIMETYPES.hasOwnProperty(ext)) {
    return DEFAULT_MIMETYPES[ext];
  } else {
    return DEFAULT_MIMETYPES['default'];
  }
}

function registerNewProtocol(rel, name) {
  return () => {
    let { protocol } = require('electron');
    protocol.registerBufferProtocol(name, (request,callback) => {
      var reqPath = request.url
        .replace(name+'://', '')
        .replace(/#.*$/, '')
        .replace(/\?.*$/, '');

      fse.readFile(path.join(rel,reqPath)).then((data) => {
        var mime = estimateMimeType(reqPath);
        callback({'mimeType': mime, 'data': data, 'charset': 'utf-8'});
        console.log(`pembed: found "${request.url}"`);
      }).catch((error) => {
        callback({'mimeType': 'text/html', 'data': NOT_FOUND});
        console.log(`pembed: not found "${reqPath}"`);
      });
    });
  }
}

var pembed = {

  estimateMimeType,

  runProtocolRedirection: function(relPath, protocolName) {
    const {app,protocol} = require('electron');
    if (app.isReady()) {
      registerNewProtocol(relPath, protocolName)();
    } else {
      app.prependOnceListener('ready', registerNewProtocol(relPath, protocolName));
    }
    //const {app,protocol} = require('electron');
    //app.prependOnceListener('ready', registerNewProtocol(relPath, protocolName));
    //});
  },

  createEmbeddedModule: function(basePath, modules, outFile) {
  },

  makeProtocolNameHeader: async function(config, outFile) {
    return await fse.writeFile(outFile, `"${config.protocol}"`);
  },

  buildNativeModule: async function(_config) {
    const exec = util.promisify(require('child_process').exec);
    var config = applyDefaultConfig(_config);
    try {
      var pj = { 'name': config.protocol, 'version': '1.0.0', 'description': '', 'main': 'index.js', 'author': 'DuongMX', 'license': 'UNLICENSED', 'private': true, };
      var gyp = { "targets": [ { "target_name": "pembed", "sources": [ "./pembed.cc" ] } ] };

      await fse.copy(path.join(__dirname,'resource'), config.buildDir);
      let idList = await makeDefinitionFile(config, config.buildDir);
      idList.forEach( id => gyp.targets[0].sources.push(`./${id}.c`) );
      await this.makeProtocolNameHeader(config, path.join(config.buildDir, 'protocol_name.h'));

      console.log('pembed: building.. ');
      await fse.writeFile(path.join(config.buildDir,'binding.gyp'), JSON.stringify(gyp));
      await fse.writeFile(path.join(config.buildDir,'package.json'), JSON.stringify(pj));

      var result = await exec(config.buildCommand, {cwd: config.buildDir});
      console.log('pembed: building finished.');
      return result;
    } catch(e) {
      console.log('pembed: error '+e);
    }
  }
};

module.exports = pembed;

