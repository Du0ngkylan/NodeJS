'use strict';

// Node.js Electron modules.
const {net} = require('electron');

// Goyo modules.
const { appEnv } = require('./goyo-app-env');
const logger = require('./goyo-log')('goyo-web-api');

// Constant values.
const API_KEY = '3LJNyKXcHUatynl8hJ46gaEmmo6xTMRg5tCOG94k';
const DEFAULT_TIMEOUT = (appEnv.settings.apiTimeout!=null) ? appEnv.settings.apiTimeout : 5000;


module.exports = {
  async registerLicense(license_key, license_password, device_name, device_code, user_info) {
    let registerLicenseUrl = `${appEnv.endPoint}goyo/api/license/regist`;
    let postBody = Object.assign({}, {
      "license_key": license_key,
      "license_password": license_password,
      "device_name": device_name,
      "device_code": device_code,
      "email": user_info.email,
      "password": user_info.password,
      "name": user_info.name,
      "name_kana": user_info.name_kana,
      "postcode": user_info.postcode,
      "pref": user_info.pref,
      "address": user_info.address,
      "building": user_info.building,
      "tel": user_info.tel,
      "company_name": user_info.company_name,
      "company_name_kana": user_info.company_name_kana,
      "department": user_info.department,
      "department_kana": user_info.department_kana,
      "mail_magazine": user_info.mail_magazine,
      });
      
    return this._sendPostRequest(registerLicenseUrl,postBody);
  },

  async checkLicense(device_id, device_code) {
    let checkLicenseUrl = `${appEnv.endPoint}goyo/api/license/check`;
    let postBody = {
      "device_id": device_id,
      "device_code" : device_code
      }
    return this._sendPostRequest(checkLicenseUrl,postBody);
  },

  async isValidKey(license_key, license_password, device_code) {
    let isvalidUrl = `${appEnv.endPoint}goyo/api/license/isvalidkey`;
    let postBody = {
      "license_key": license_key,
      "license_password": license_password,
      "device_code" : device_code
      }
    return this._sendPostRequest(isvalidUrl,postBody);
  },

  async existsMail(email) {
    let existsMailUrl = `${appEnv.endPoint}goyo/api/license/existsmail`;
    return this._sendPostRequest(existsMailUrl,{'email': email});
  },

  async getCustomerInfo(email, password) {
    let customerInfoUrl = `${appEnv.endPoint}goyo/api/license/getcustomerinfo`;
    let postBody = {
      "email": email,
      "password": password
      }
    return this._sendPostRequest(customerInfoUrl,postBody);
  },

  async postcode2Address(postcode) {
    postcode = postcode.replace('-','');
    let postcode2AddressUrl = `${appEnv.endPoint}postcode/?p=${postcode}`;
    return this._sendGetRequest(postcode2AddressUrl);
  },

  async getAlbumTemplateList(device_id, version) {
    //let albumTemplateUrl = `https://b7cnpk5gm0.execute-api.ap-northeast-1.amazonaws.com/test/goyo/api/app/getalbumtemplatelist`;
    let albumTemplateUrl = `${appEnv.endPoint}goyo/api/app/getalbumtemplatelist`;
    let postBody = {
      "device_id":device_id,
      "version":version
      }
    let timeoutPromise = setTimeoutPromise(3000);
    let result = this._sendPostRequest(albumTemplateUrl,postBody);
    if (!result) {
      timeoutPromise.cancel();
      return null;
    }
    return result;
  },

  async checkUpdate(device_id, version, arch) {
    let checkupdateUrl = `${appEnv.endPoint}goyo/api/app/checkupdate`;
    let postBody = {
      "device_id": device_id,
      "version": version,
      "architecture": arch
    };
    return this._sendPostRequest(checkupdateUrl, postBody);
    //return { code: 200 };  // if the update does not exists.
    // Or { code: 201: version: '1.0.1', url: 'https:....' } if the update exists.
    // Or throw exception otherwise.
  },

  async getInformationList(device_id, version, architecture) {
    let appInfoUrl = `${appEnv.endPoint}goyo/api/app/info`;
    let postBody = {
      "device_id": device_id,
      "version": version,
      "architecture": architecture
    };
    return this._sendPostRequest(appInfoUrl, postBody);
  },

  webApiIsAccessible() {
    let _s = Date.now();

    let checkNetworkUrl = `${appEnv.endPoint}goyo/api/app/network`;
    return new Promise((resolve,reject) => {
      var get_options = {
        method: 'GET',
        url: checkNetworkUrl,
        headers: {
          'x-api-key': API_KEY,
          'timestamp': Date.now()
        }
      };
      const request = net.request(get_options);
      setTimeout(() => { request.abort(); resolve(false); }, DEFAULT_TIMEOUT);
      request.on('response', (response) => {
        logSuccess(checkNetworkUrl, get_options, response.statusCode, _s);
        resolve(response.statusCode===200);
      });
      request.on('error', e => { logFail(checkNetworkUrl, '', _s); resolve(false); });
      request.end();
    });
  },

  getProgressMovieUrl() {
    return `${appEnv.endPoint}info/goyo/movie/progress_dash.mp4`;
  },

  // private property
  _sendPostRequest(url, postBody){
    let _s = Date.now();
    return new Promise((resolve, reject) => {
      postBody = JSON.stringify(postBody);
      var post_options = {
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      };
      const request = net.request(post_options);
      setTimeout(() => { request.abort(); reject(new ApiTimeoutError(url, DEFAULT_TIMEOUT)); }, DEFAULT_TIMEOUT);
      let body = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          let result = JSON.parse(body);
          if (result.code === 500) {
            logFail(url, postBody, _s);
            reject(result)
          } else {
            logSuccess(url, postBody, body, _s);
            resolve(result);
          }
        });
        response.on("error", (e) => {
          logFail(url, postBody, _s);
          reject(e);
        });
      });
      request.on('error', e => {
        logFail(url, postBody, _s);
        reject(e);
      });
      request.write(postBody);
      request.end();
    });
  },
  // private property
  _sendGetRequest(url){
    let _s = Date.now();
    return new Promise((resolve, reject) => {
      const request = net.request(url);
      setTimeout(() => { request.abort(); reject(new ApiTimeoutError(url, DEFAULT_TIMEOUT)); }, DEFAULT_TIMEOUT);
      let body = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          body += chunk.toString('utf8');
        });
        response.on('end', () => {
          logSuccess(url, '', body, _s);
          resolve(body);
        });
        response.on("error", (e) => {
        logFail(url, '', _s);
          reject(e);
        });
      });
      request.on('abort', e => { });
      request.on('error', e => {
        logFail(url, '', _s);
        reject(e);
      });
      request.end();
    });
  }
};

function ApiTimeoutError(url, time) {
  Error.captureStackTrace(this, ApiTimeoutError);
  this.message = `API Timeout(${time}msec)`;
  this.request = url;
}

function logSuccess(url, reqBody, respBody, s) {
  let code='   ';
  try {
    code = String(JSON.parse(respBody).code).padStart(3, '0');
  } catch(e) {}

  let timeStr = (typeof s==='number') ? `in ${Date.now()-s} msec` : 'f';
  logger.info (`success(${code}): ${url} ${timeStr}`);
  logger.debug(`request: ${reqBody}`);
  logger.debug(`response: ${respBody}`);
}

function logFail(url, reqBody, s) {
  let timeStr = (typeof s==='number') ? `in ${Date.now()-s} msec` : '';
  logger.info(`fail: ${url} ${timeStr}`);
  logger.debug(`request: ${reqBody}`);
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