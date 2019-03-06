const path = require('path');
const fse = require('fs-extra');
const encoding = require('encoding-japanese');
const xml2js = require('xml2js');
const CONSTRUCTION_PHOTO_INFO_TAG_LIST =['<写真情報>','<写真ファイル名>','<写真-大分類>','<写真区分>','<工種>','<種別>','<細別>','<写真タイトル>','<撮影箇所>','<撮影年月日>','<施工管理値>','<代表写真>','<提出頻度写真>','<工種区分予備>','<参考図>','<参考図情報>','<参考図ファイル名>','<参考図タイトル>'];

const supportExtensionList = ['xml','txt'];
let main = {
  async isGoyo18DataExits(filePath){
    let promiseArray = [];
    for(let itr of supportExtensionList){
      let file = changeExtensions(filePath,itr);
      promiseArray.push(fileExits(file));
    }
    let resolve = await Promise.all(promiseArray);
    let result = resolve.filter(val => val == true);
    if(result && result.length != 0){
      return true;
    }
    return false;
  },
  
  async readData(filePath){
    let xmlPath = changeExtensions(filePath,'xml');
    let txtPath = changeExtensions(filePath,'txt');
    let xml = await readXml(xmlPath);
    let txt = await readTxt(txtPath);
    let result = dataConverter(xml,txt,filePath);
    return result;
  },
  async readTxt(filePath){
    let txt = await readTxt(filePath);
    let result = convertTxt(txt);
    return result;
  },
  async readXml(filePath){
    let xml = await readXml(filePath);
    let result = convertXml(xml);
    return result;
  }
}

module.exports = main;

async function readTxt(txtPath){
  let readText;
  try {
    validateExtension(txtPath,'.txt');
    let textReadBuffer = await fse.readFile(txtPath);
    let convertBuffer = encoding.convert(textReadBuffer,'UTF8','AUTO');
    let bufferInstance = Buffer.from(convertBuffer);
    readText = bufferInstance.toString();
    let crLfreg = /\r/g;
    readText = readText.replace(crLfreg,'');
  } catch (error) {
    return null;
  }
  return readText;
}
function validateExtension(filePath,trueExtension){
  let name = getNameFromPath(filePath);
  if(!name){
    throw new Error('empty filePath');
  }
  let extension = path.extname(name);
  if(extension.toLowerCase() !== trueExtension){
    throw new Error(`not ${trueExtension} file`);
  }
}
function dataConverter(xmlData,txtData,filePath){
  let xml = xmlData?convertXml(xmlData,filePath):null;
  let txt = txtData?convertTxt(txtData):null;
  if(!xml && !txt){
    return null;
  }
  let result = {xml,txt}
  return result;
}
function convertXml(jsonXml,filePath){
  if(!jsonXml){
    return null;
  }
  let photoInfo = jsonXml['写真情報']; 
  if(!photoInfo){
    return null;
  }
  if(photoInfo.hasOwnProperty('撮影年月日')){
    let shootingDate = photoInfo['撮影年月日'];
    if(shootingDate && shootingDate !== ''){
      shootingDate = shootingDate.substr(0,4)+ '-' + shootingDate.substr(4,2) + '-' + shootingDate.substr(6,2);
      photoInfo['撮影年月日'] = shootingDate;
    }
  }
  //frame diagram case
  photoInfo.hasOwnProperty('参考図')? delete photoInfo['参考図']:null;
  //DRA case
  photoInfo.hasOwnProperty('参考図情報')? delete photoInfo['参考図情報']:null;
  return jsonXml;
}
function convertTxt(jsonTxt){
  if(!jsonTxt){
    return null;
  }
  return jsonTxt;
}
async function fileExits(filePath){
  try {
    await fse.stat(filePath);
  } catch (error) {
    return false;
  }
  return true;
}

function changeExtensions(filePath,Extension){
  let noDotPath = pathDeleteExtension(filePath);
  if(!filePath){
    return filePath;
  }
  if(!Extension){
    return filePath;
  }
  let result = noDotPath + '.' + Extension; 
  return result;
}
function pathDeleteExtension(filePath){
  if(!filePath){
    return '';
  }
  let parseObj = path.parse(filePath)
  let noDotPath = path.join(parseObj.dir,parseObj.name);
  return noDotPath;
}
function getNameFromPath(filePath){
  let fileName = path.basename(filePath);
  return fileName;
}
async function readXml(xmlPath){
  let result;
  try {
    let parseXmlToJson = 
      await createJsonFromXML.convertPhotoInformation(xmlPath);  
    result = parseXmlToJson;
  } catch (error) {;
    return null;
  }
  return result;
}
var createJsonFromXML = {
  parseXml:function(data) {
    return new Promise((resolve,reject) => {
      let parser = new xml2js.Parser();
      parser.parseString(data, function(err, result) {
        if (err) { reject(err); }
        else { 
          for(let key in result){
            if(key === '写真情報'){
              for(let key2 in result[key]){
                if(key2 === '参考図' || key2 === '参考図情報'){
                  continue;
                }
                let element = result[key][key2][0];
                //illegal xml case;
                if(typeof element === 'object'){
                  reject('illgal date type');
                }
              }
            }
          }
          resolve(result);
        }
      });
    });
  },
  abnormalTagParser:async function(xmlData){
    // Spit givenXML into metadata line & XML lines
    function getEscapedXml(givenXML, givenTags) {
      try {
        let seperatorIndex = givenXML.indexOf('\n') + 1;
        let firstLine = givenXML.substring(0, seperatorIndex);
        let raw_XML = givenXML.substring(seperatorIndex, givenXML.length);
        raw_XML = replaceAll(raw_XML, '&', '&amp;');
        raw_XML = replaceInvalidThanSign(raw_XML);
        let tagsList = addCloseTags(givenTags);
        let errorArray = getInvalidTags(raw_XML, tagsList);
        errorArray.forEach((value) => {
          raw_XML = raw_XML.replace(value, escapeContent(value));
        });
        
        return firstLine + raw_XML;
      } catch (error) {
        return null  
      }
    }
    // Return array of given open & close tags
    function addCloseTags(givenTags) {
      let tagsList = [];
      givenTags.forEach((value) => {
        tagsList.push(value);
        tagsList.push(value.replace('<', '</'));
      });
    
      return tagsList;
    }
    
    // Return array of invalid tags
    function getInvalidTags(RAW_XML, tagsList) {
      let errorArray = [];
    
      RAW_XML.match(/<.*?>/g).forEach((value) => {
        if (!tagsList.includes(value)) {
          errorArray.push(value);
        }
      });
    
      return errorArray;
    }
    
    // Replace special symbols by escape sequence
    function escapeContent(content) {
      if (content != null) {
        content = replaceAll(content, '&', '&amp;');
        content = replaceAll(content, '>', '&gt;');
        content = replaceAll(content, '<', '&lt;');
        content = replaceAll(content, '"', '&quot;');
        content = replaceAll(content, '\'', '&apos;');
      }
      return content;
    }
    
    function replaceAll(fullStr, oldStr, newStr) {
      return fullStr.replace(new RegExp(oldStr, 'g'), newStr);
    }
    function replaceInvalidThanSign(RAW_XML){
      let lessThanSignSwitch = false;
      let lessThanSignPosition;
      let greaterThanSignSwitch = false;
      let charCount = 1;
      for(var v of RAW_XML) {
        if(v === '<'){
          greaterThanSignSwitch = false;
          if(lessThanSignSwitch){
            RAW_XML = replaceChar(RAW_XML,lessThanSignPosition,'&lt;');
            RAW_XML = replaceInvalidThanSign(RAW_XML);
            return RAW_XML;
          }else{
            lessThanSignSwitch = true;
            lessThanSignPosition= charCount;
          }
        }
        if(v === '>'){
          lessThanSignSwitch = false;
          if(greaterThanSignSwitch){
            RAW_XML = replaceChar(RAW_XML,charCount,'&gt;');
            RAW_XML = replaceInvalidThanSign(RAW_XML);
            return RAW_XML;
          }else{
            greaterThanSignSwitch = true;
          }
        }
        charCount++;
      }
      return RAW_XML
    }
    function replaceChar(str,idx,newStr){
      idx = idx - 1; 
      let res = str.slice(0, idx) + newStr + str.slice(idx);
      let dIdx = idx + newStr.length;
      res = res.slice(0, dIdx) + res.slice(dIdx + 1);
      return res;
    }
    let xmlConvertData =  getEscapedXml(xmlData,CONSTRUCTION_PHOTO_INFO_TAG_LIST);
    return await this.parseXml(xmlConvertData);
  },
  xml2obj:async function(convertTarget) {
    let data = await fse.readFile(convertTarget, {encoding: null});
    let xmlstr = null;
  
    if (encoding.detect(data, 'UTF16LE')) {
      xmlstr = data.toString('utf16le');
    } else if (encoding.detect(data, 'UTF8')) {
      xmlstr = data.toString('utf8');
    } else if (encoding.detect(data, 'JIS')) {
      let message =
        `${NAME} Error: \n`+
        `\tunexpected encoding: ${encoding.detect(data)}\n`+
        `\tfile: ${convertTarget}`;
      console.log(message);
      throw message;
    } else if (encoding.detect(data, 'SJIS')) {
      xmlstr = Buffer.from(encoding.convert(data, 'UTF8', 'SJIS')).toString('utf8');
    } else {
      let message =
        `${NAME} Error: \n`+
        `\tunexpected encoding: ${encoding.detect(data)}\n`+
        `\tfile: ${convertTarget}`;
      console.log(message);
      throw message;
    }
  let result;
  try {
    result = await this.parseXml(xmlstr);
  } catch (error) {
    result = await this.abnormalTagParser(xmlstr);
  }
    if (result.hasOwnProperty('写真情報') || result.hasOwnProperty('参考図情報')) {
      return result;
    } else {
      throw new Error('illegal xml');
    }
  },
  makePropertiesFlatten:function(object) {
    if(!object){
      return null;
    }
    let result = {};
  
    for (let [key,value] of Object.entries(object)) {
      if (key === '写真情報' ) {
        result[key] = this.makePropertiesFlatten(value);
      } else if (key === '参考図' ) {
        result[key] = value;
      } else if (key === '参考図情報') {
        if (value instanceof Array) {
          result[key] = value.map( v => this.makePropertiesFlatten(v) );
        } else {
          result[key] = this.makePropertiesFlatten(value);
        }
      } else {
        result[key] = value[0];
      }
    }
  
    return result;
  },
  refrenceDiagramMakePropertiesFlatten:function(object){
    if(!object){
      return null;
    }
    let refrenceDiagramElement = {};
    for (let key in object) {
      if(object[key][0]){
        refrenceDiagramElement[key] = object[key][0];
      }
    }
    let resultObject = {'参考図情報': refrenceDiagramElement};
    return resultObject;
  },
  convertPhotoInformation:async function(convertTarget) {
    let obj = await this.xml2obj(convertTarget);
    if (!obj) {
      return {converted: []};
    }
    let result;
    if(obj['参考図情報']){
      result = this.refrenceDiagramMakePropertiesFlatten(obj['参考図情報']);
    }else{
      result = this.makePropertiesFlatten(obj);
    }
    return result;
  }
};