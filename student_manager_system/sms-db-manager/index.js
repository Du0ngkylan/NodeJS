const path = require('path');
const existsSync = require('fs').existsSync;

module.exports = {
  get includePath() {
    return path.join(__dirname, './include');
  },
  get sourceHeaderPath() {
    return path.join(__dirname, './src_h');
  },
  get libraryPath() {
    let debug = path.join(__dirname, './build/Debug/');
    let release = path.join(__dirname, './build/Release/');
    if (existsSync(debug)) {
      return debug;
    } else {
      return release;
    }
  }
};
