const logger = (function() {
'use strict';

  const { remote } = require('electron');
  const goyoLog = remote.require('./lib/goyo-log');

  // Constant values.
  const LOG_LEVELS = [ 'FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE' ];
  const LOG_TRACE = 5;
  const LOG_DEBUG = 4;
  const LOG_INFO = 3;
  const LOG_WARN = 2;
  const LOG_ERROR = 1;
  const LOG_ABORT = 0;

  class Logger {
    constructor(name, level=3) {
      this.name = name;
      this.level = level;
    }

    log(level, data, error=null) {
      if (level <= this.level) {
        let prefix = `${LOG_LEVELS[level]} ${this.name}`;

        log(prefix, toString(data));
        if (error) {
          if (error.type) {
            log(prefix+ ' type', error.type);
          }
          if (error.message) {
            log(prefix + ' message', error.message);
          }
          if (error.request != null) {
            log(prefix + ' request', error.request);
          }
          log(prefix, error.stack);
        }
      }
    }

    trace(data) {
      this.log(LOG_TRACE, data);
    }

    debug(data) {
      this.log(LOG_DEBUG, data);
    }

    info(data) {
      this.log(LOG_INFO, data);
    }

    warn(data) {
      this.log(LOG_WARN, data);
    }

    error(data, error) {
      this.log(LOG_ERROR, data, error);
    }

    abort(data, error) {
      this.log(LOG_ABORT, data, error);
    }
  }

  function log(prefix, message) {
    if (typeof message === 'string') {
      goyoLog.raw(prefix, message);
    }
  }

  function toString(data) {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    } else {
      return data;
    }
  }

  function makeLogger(name) {
    const { appEnv } = remote.require('./lib/goyo-app-env');
    if (appEnv && appEnv.settings && appEnv.settings.logLevels) {
      let levels = appEnv.settings.logLevels;
      if (levels.hasOwnProperty(name)) {
        let lv = levels[name].level;
        return new Logger(name, lv);
      } else if (levels.hasOwnProperty('default')) {
        let lv = levels['default'].level;
        return new Logger(name, lv);
      } else {
        return new Logger(name);
      }
    } else {
      return new Logger(name);
    }
  }


  let logName = document.currentScript.getAttribute('logname'); 
  return makeLogger(logName);
}());

