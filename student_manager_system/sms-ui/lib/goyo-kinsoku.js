'use strict';

// Node.js modules.
const path = require('path');
// 3rd-party modules.
const fse = require('fs-extra');
const iconv = require('iconv-lite');

const KINSOKU_NAME = "kinsoku.dat";

const KINSOKU_ORG_PATH = path.join(
  __dirname, 
  '../resources', 
  'initialbookrack',
  KINSOKU_NAME
);

const JISX0201_PATH = path.join(
  __dirname, 
  '../resources', 
  'initialbookrack',
  'JISX0201.dat'
);
const JISX0208_PATH = path.join(
  __dirname, 
  '../resources', 
  'initialbookrack',
  'JISX0208.dat'
);

async function writeKinsokuFile(val, path){
  let updateKinsokuData = '';
  for(let row of val){
    updateKinsokuData += row.before + ',' + row.after + '\r\n';
  }
  return await fse.writeFile(path, updateKinsokuData, 'utf16le');
};
async function readKinsokuFile(path){
  let strStream = await fse.readFile(path, { encoding: 'utf16le' });
  let valObj = strStream.split('\r\n');
  let arrayobj = [];
  let id = 1;
  valObj.forEach(element => {
    if (element.length > 0) {
      let renobj = { id: "000", before: "" , after: "" };
      renobj.id = ( '000' + id ).slice( -3 );
      id++;
      renobj.before = element.split(',')[0];
      renobj.after = element.split(',')[1];
      arrayobj.push(renobj);
    }
  });
  return arrayobj;
};
async function readFile(path){
  let strStream = await fse.readFile(path, { encoding: 'utf16le' });
  return strStream;
};

module.exports = {
  kinsokuData: null,
  jisx0201Data: null,
  jisx0208Data: null,
  KINSOKU_PATH: null,
  initialize: function(goyoAppFolder){
    this.KINSOKU_PATH = path.join(
        goyoAppFolder,
        KINSOKU_NAME
      );
    this.getKinsokuFile();
  },
  getKinsoku: function(){
    return this.kinsokuData;
  },
  getKinsokuFile: async function(){
    // users kinsoku file
    this.kinsokuData = await readKinsokuFile(this.KINSOKU_PATH)
      .catch(async function(error) {
        console.log(error);
        // original kinsoku file
        return await readKinsokuFile(KINSOKU_ORG_PATH);
    });
  },
  addKinsoku: async function(val){
    if(!this.kinsokuData){
      this.kinsokuData = [];
    }
    if(val){
      this.kinsokuData.push(val);
      return true;
    }
    return false;
  },
  changeKinsoku: async function(val){
    if(val){
      this.kinsokuData.forEach(element => {
        if(element.id === val[0].id){
          element.after = val[1].after;
          element.before = val[1].before;
        }
      });
      return true;
    }
    return false;
  },
  deleteKinsoku: async function(val){
    if(val){
      this.kinsokuData = this.kinsokuData.filter(value => value.id !== val.id);
      let id = 1;
      this.kinsokuData.forEach(element => {
        element.id = ( '000' + id ).slice( -3 );
        id++;
      });
      return true;
    }
    return false;
  },
  initKinsoku: async function(){
    // original kinsoku file
    this.kinsokuData = await readKinsokuFile(KINSOKU_ORG_PATH);
  },
  updateKinsokuFile: async function(val){
    if(val){
      this.kinsokuData = val;
      await writeKinsokuFile(this.kinsokuData, this.KINSOKU_PATH);
      return true;
    }
    return false;
  },
  updateKinsoku: async function(val){
    if(val){
      this.kinsokuData = val;
      return true;
    }
    return false;
  },
  convKinsoku: async function(val, knackId){
    if(!this.kinsokuData){
      await this.getKinsokuFile();
    }
    if(val){
      let result = String(val);
      let flgConv = false;
      for(let kinsoku of this.kinsokuData){
        let strMatch =  kinsoku.before;
        if(!flgConv){
          // BOM removal
          if(strMatch.length > 1) strMatch = strMatch.slice(1);
          flgConv = result.match(strMatch) ? true : false;
        }
        let re = new RegExp(strMatch, 'g');
        result = result.replace(re, kinsoku.after);
      }
      let before = result;
      result = await this.conversion(result, knackId);
      if(result !== before){
        flgConv = true;
      }
      return {value: result, conv: flgConv};
    }else{
      return {value: '', conv: false};
    }
  },
  conversion: async function(val, knackId){
    let rc = val;
    let knacktype = '';
    var isKnackTypeNEXCO = (knackId === 90 || knackId === 801 || knackId === 802);
    if(isKnackTypeNEXCO){
      knacktype = '6';
    }
    const mapDakuon = {
      'ｶﾞ':'ガ', 'ｷﾞ':'ギ', 'ｸﾞ':'グ', 'ｹﾞ':'ゲ', 'ｺﾞ':'ゴ',
      'ｻﾞ':'ザ', 'ｼﾞ':'ジ', 'ｽﾞ':'ズ', 'ｾﾞ':'ゼ', 'ｿﾞ':'ゾ',
      'ﾀﾞ':'ダ', 'ﾁﾞ':'ヂ', 'ﾂﾞ':'ヅ', 'ﾃﾞ':'デ', 'ﾄﾞ':'ド',
      'ﾊﾞ':'バ', 'ﾋﾞ':'ビ', 'ﾌﾞ':'ブ', 'ﾍﾞ':'ベ', 'ﾎﾞ':'ボ',
      'ﾊﾟ':'パ', 'ﾋﾟ':'ピ', 'ﾌﾟ':'プ', 'ﾍﾟ':'ペ', 'ﾎﾟ':'ポ',
      'ｳﾞ':'ヴ'
    };
    const mapFull = [
      '。','「','」','、','・','ヲ','ァ','ィ','ゥ','ェ','ォ','ャ','ュ','ョ','ッ',
      'ー','ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ',
      'タ','チ','ツ','テ','ト','ナ','ニ','ヌ','ネ','ノ','ハ','ヒ','フ','ヘ','ホ','マ',
      'ミ','ム','メ','モ','ヤ','ユ','ヨ','ラ','リ','ル','レ','ロ','ワ','ン','゛','゜'
    ];
    var toFullWidthKana = function(value) {
      let str = value.replace(/[ｳｶ-ﾄﾊ-ﾎ]ﾞ|[ﾊ-ﾎ]ﾟ/g, function(match) {
          return mapDakuon[match];
      });
      return str.replace(/[｡-ﾟ]/g, function(match) {
          return mapFull[match.charCodeAt(0) - 0xFF61];
      });
    };
    var toOneByteAlphaNumeric = function(value){
      return value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(match) {
          return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
      });
    };
    var toFullWidthSymbolChara = function(value) {
      let str = value.replace(/[！＃＄％＆（）＊＋，．／：；＜＝＞？＠［］＾＿｀｛｜｝]/g, function(match) {
          return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
      }).replace(/￥/g, '\\');
      return str;
    };
    var toFullWidthSymbols = function(value){
      let str = value.replace(/[¢£¬]/g, function(match) {
        if (match === '¬') {
          return String.fromCharCode(match.charCodeAt(0) + 0xFF36);
        } else {
          return String.fromCharCode(match.charCodeAt(0) + 0xFF3E);
        }
      });
      return str;
    };
    var toOtherCaseConversion = function(value) {
      let str = value.replace(/[−]/g, function(match) {
        return '-';
      })
      return str;
    }
    // case : nexco
    // Full-width half-width conversion of symbol characters
    if(knacktype === '6'){
      rc = toFullWidthSymbolChara(rc);
    }

    // case : all
    rc = toOtherCaseConversion(rc);
    // Half width full width conversion of kana character
    rc = toFullWidthKana(rc);

    // Full-width half-width conversion of symbols
    rc = toFullWidthSymbols(rc);

    // Full-width halfwidth conversion of alphanumeric characters
    rc = toOneByteAlphaNumeric(rc);

    return rc;
  },
  checkUsableCharacters: async function(val){
    let rc = false;
    let type = val.type;
    let message;
  
    if(type === 'delete'){
      return { rc: rc ,  message: message }; 
    }
  
    var isInputCheck = (val.before !== '' && val.after !== '');
    if(!isInputCheck) { 
      rc = true;
      message = 'NoInput';
    }
  
    if(type === 'add'){
      if(isInputCheck){
        rc = await this.isCheckKinsoku(val.before);
        if(rc){
          message = 'Registered';
        }
      }
    }
    
    if(!rc){
      let beforeResult = await this.isCheckUsableChara(val.before);
      let afterResult = await this.isCheckUsableChara(val.after);
      if(beforeResult.check) {
        // val.before character check. An error occurs if the specified characters match from the usable characters of JIS X 0201, JIS X 0208
        rc = true;
        message = 'Unspecified';
      } else if (!afterResult.check) {
        // val.after character check. An error occurs if the specified characters do not match from the usable characters of JIS X 0201, JIS X 0208
        rc = true;
        message = 'Included';
      } 
    }
  
    return { rc: rc ,  message: message };
  },
  isCheckKinsoku: async function(value){
    if(!this.kinsokuData){
      await this.getKinsokuFile();
    }

    let rc = false;
    for(let kinsoku of this.kinsokuData){
      if(!rc){
        rc = value.indexOf(kinsoku.before) !== -1 ? true : false;
      }
    }
    return rc;
  },
  isCheckUsableChara: async function(value){
    if(!this.jisx0201Data){
      this.jisx0201Data = await readFile(JISX0201_PATH);
    }
    if(!this.jisx0208Data){
      this.jisx0208Data = await readFile(JISX0208_PATH);
    }

    let rc = true;
    let objList = Array.from(value);
    let kinsokuCharas = [];
    objList.forEach(element => {
      let codePointChara = iconv.encode(element, "UTF-16BE").toString('hex');
      if(codePointChara !== "000a"){
        var checkRc = (
          this.jisx0201Data.indexOf(codePointChara) !== -1 ||
          this.jisx0208Data.indexOf(codePointChara) !== -1
        );
        if (!checkRc) {
          rc = checkRc;
          kinsokuCharas.push(element);
        }
      }
    });

    return {"check": rc, "kinsokuChara": kinsokuCharas.join('')};
  }
};
