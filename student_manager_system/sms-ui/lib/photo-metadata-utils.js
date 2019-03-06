'use strict';

const path = require('path');
const {remote} = require('electron');
const fse = require('fs-extra');
const settingsOperation = require('./goyo-settings-operation');

const filePropertyMap = {
  "fileName":                 ["ファイル名",              getFileBaseName],
  "fileSize":                 ["ファイルサイズ",          getFileSize],
  "memorySize":               ["メモリー上のサイズ",      ""],
  "originalDate":             ["オリジナル画像の日時",    "FILE:OriginalDate"],
  "fileDate":                 ["ファイル日時",            "FILE:FileDate" ],
  "format":                   ["フォーマット",            "FILE:ImageFormat"],
  "compression":              ["圧縮",                    ""],
  "pixel":                    ["幅×高さ（ピクセル）",    getSizeText ],
  "colorPixel":               ["ビット／ピクセル（色数）",getBppText],
  "playbackTime":             ["再生時間",                ""],
  "transparency":             ["透過色",                  ""],
};

const additionalPropertyMap = {
  "imageDirection":           ["画像方向",                "EXIF:Orientation"],
  "widthResolution":          ["幅の解像度",              "EXIF:XResolution"],
  "heightResolution":         ["高さの解像度",            "EXIF:YResolution"],
  "resolutionUnit":           ["幅と高さの解像度の単位",  "EXIF:ResolutionUnit"],
  "curve":                    ["再生階調カーブ特性",      "EXIF:TransferFunction"],
  "whiteChromaticityCoordinateValue": ["参照白色点の色度座標値", "EXIF:WhitePoint"],
  "primaryColorValue":        ["原色の色度座標値",        "EXIF:PrimaryChromaticities"],
  "colorConversionMatrix":    ["色変換マトリクス係数",    "EXIF:YCbCrCoefficients"],
  "referenceBlackAndWhite":   ["参照黒色点値と参照白色点値", "EXIF:ReferenceBlackWhite"],
  "modificationDate":         ["ファイル変更日時",        "EXIF:ModifyDate"],
  "title":                    ["画像タイトル",            "EXIF:ImageDescription"],
  "inputDeviceManufacturer":  ["入力機器のメーカー名",    "EXIF:Make"],
  "inputDeviceModel":         ["入力機器のモデル名",      "EXIF:Model"],
  "useSoftware":              ["使用ソフトウェア",        "EXIF:Software"],
  "author":                   ["作者名",                  "EXIF:Artist"],
  "copyrightHolder":          ["著作権者",                "EXIF:Copyright"],
};

const exifPropertyMap = {
  // EXIF(1)
  "version":                  ["Exifバージョン",          "EXIF:ExifVersion"],
  "colorSpace":               ["色空間情報",              "EXIF:ColorSpace"],
  "componentMeaning":         ["各コンポーネントの意味",  "EXIF:ComponentsConfiguration"],
  "compressionMode":          ["画像圧縮モード",          "EXIF:Compression"],
  "effectiveImageWidth":      ["実効画像幅",              "EXIF:ExifImageWidth"],
  "effectiveImageHeight":     ["実効画像高さ",            "EXIF:ExifImageHeight"],
  "manufacturerNote":         ["メーカーノート",          "EXIF:MakerNote"],
  "userComment":              ["ユーザーコメント",        "EXIF:UserComment"],
  "originalCreateDate":       ["原画像データの生成日時",  "EXIF:DateTimeOriginal"],
  "digitalCreateDate":        ["デジタルデータの作成日時","EXIF:CreateDate"],

  // EXIF(2)
  "exposureTime":             ["露出時間",                "EXIF:ExposureTime"],
  "fNumber":                  ["Fナンバー",               "EXIF:FNumber"],
  "exposureProgram":          ["露出プログラム",          "EXIF:ExposureProgram"],
  "shootingSensitivity":      ["撮影感度",                "EXIF:ISO"],
  "shutterSpeed":             ["シャッタースピード",      "EXIF:ShutterSpeedValue"],
  "aperture":                 ["絞り値",                  "EXIF:ApertureValue"],
  "brightness":               ["輝度値",                  "EXIF:BrightnessValue"],
  "exposureCorrection":       ["露光補正値",              "EXIF:ExposureCompensation"],
  "lensMinF":                 ["レンズ最小F値",           "EXIF:MaxApertureValue"],
  "distance":                 ["被写体距離",              "EXIF:SubjectDistance"],
  "metering":                 ["測光方式",                "EXIF:MeteringMode"],
  "lightSource":              ["光源",                    "EXIF:LightSource"],
  "flash":                    ["フラッシュ",              "EXIF:Flash"],
  "focalDistance":            ["レンズ焦点距離",          "EXIF:FocalLength"],
  "flashIntensity":           ["フラッシュ強度",          "EXIF:FlashEnergy"],

  // EXIF(3)
  "spectralSensitivity":      ["スペクトル感度",          "EXIF:SpectralSensitivity"],
  "phnFunction": ["光電変換関数",     "EXIF:OEFC"],
  "frequencyResponotoelectricConversiose":        ["空間周波数応答",          "EXIF:SpatialFrequencyResponse"],
  "focalPlaceWidth":          ["焦点面の幅の解像度",      "EXIF:FocalPlaneXResolution"],
  "focalPlaceHeight":         ["焦点面の高さの解像度",    "EXIF:FocalPlaneYResolution"],
  "focalSurfaceUnit":         ["焦点面解像度単位",        "EXIF:FocalPlaneResolutionUnit"],
  "subjectPosition":          ["被写体位置",              "EXIF:SubjectLocation"],
  "exposureIndex":            ["露出インデックス",        "EXIF:ExposureIndex"],
  "sensorType":               ["センサー方式",            "EXIF:SensingMethod"],
  "fileSource":               ["ファイルソース",          "EXIF:FileSource"],
  "scene":                    ["シーンタイプ",            "EXIF:SceneType"],
  "CFA":                      ["CFAパターン",             "EXIF:CFAPattern"],
};

function getFileBaseName(filepath, metadata) {
  return path.basename(filepath)
}

function getFileSize(filepath, metadata) {
  let bSize = metadata['FILE:FileSize'];
  let kSize = Math.floor((bSize / 1024) * 100) / 100;
  return kSize+' KB ('+bSize +' bytes)';
}

function getSizeText(filepath, metadata) {

  let sizes = [
    { w : 'IMAGE:Width' , h : 'IMAGE:Height'},
    { w : 'File:ImageWidth' , h : 'File:ImageHeight'},
    { w : 'EXIF:ImageWidth' , h : 'EXIF:ImageHeight'},
  ];

  for (let size of sizes) {
    if (metadata.hasOwnProperty(size.w) && metadata.hasOwnProperty(size.h)) {
      let w = metadata[size.w];
      let h = metadata[size.h];
      return `${w} x ${h}`;  
    }
  }
  return null;
}

function getBppText(filepath, metadata) {
  if (metadata.hasOwnProperty("File:BitsPerSample") && metadata.hasOwnProperty("File:ColorComponents")) {
    let bps = metadata["File:BitsPerSample"];
    let cc = metadata["File:ColorComponents"];
    return `${bps*cc} bit/pixel (${2**(bps*cc)} colors)`
  } else {
    return null;
  }
}

function makeValue(filepath, metadata, v1) {
  let value;
  //alert("metadata JSON:" + JSON.stringify(metadata, null, 2));
  //alert("v1:"+v1+",typeof:"+(typeof v1)+",hasOwnProperty:"+metadata.hasOwnProperty(v1));
  if (typeof v1 === 'function') {
    value = v1(filepath, metadata);
  } else if (typeof v1 === 'string' && metadata.hasOwnProperty(v1)) {
    //let v = (metadata[v1].val!==undefined)? metadata[v1].val: metadata[v1].num;
    let v = metadata[v1];
    v = `${v}`; // force string.
    if (v.length>0) {
      value = v;
    }
  } else {
    // nothing.
  }
  return value;
}

function dateFormat(date, format) {
  let _fmt = {
    "yyyy": function(date) { return date.getFullYear() + ''; },
    "MM": function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
    "dd": function(date) { return ('0' + date.getDate()).slice(-2); },
    "hh": function(date) { return ('0' + date.getHours()).slice(-2); },
    "mm": function(date) { return ('0' + date.getMinutes()).slice(-2); },
    "ss": function(date) { return ('0' + date.getSeconds()).slice(-2); }
  }
  let _priority = ['yyyy', 'MM', 'dd', 'hh', 'mm', 'ss'];
  return _priority.reduce((res, fmt) => res.replace(fmt, _fmt[fmt](date)), format);
}

// photo-metadata-accessorの出力をもとに表示形式に変換した文字列リストを返す
function getFormattedMetadataAll(filepath, metadata) {
  let fileInfos = [];
  let additionalInfos = [];
  let exifInfos = [];

  for (let v of Object.values(filePropertyMap)) {
    let label = v[0];
    let value = makeValue(filepath, metadata, v[1]);

    if (typeof value === 'string') {
      fileInfos.push({ label, value });
    }
  }

  for (let v of Object.values(additionalPropertyMap)) {
    let label = v[0];
    let value = makeValue(filepath, metadata, v[1]);

    if (typeof value === 'string') {
      additionalInfos.push({ label, value });
    }
  }

  for (let v of Object.values(exifPropertyMap)) {
    let label = v[0];
    let value = makeValue(filepath, metadata, v[1]);

    if (typeof value === 'string') {
      exifInfos.push({ label, value });
    }
  }

  return {
    fileInfos,
    additionalInfos,
    exifInfos,
  };
}

function getFormattedMetadataKeyAll(filepath, metadata) {
  let fileInfos = {};
  let additionalInfos = {};
  let exifInfos = {};

  for (let v of Object.keys(filePropertyMap)) {
    let label = v;
    let value = makeValue(filepath, metadata, filePropertyMap[v][1]);
    
    if (typeof value === 'string') {
      fileInfos[label] = [filePropertyMap[v][0], value];
    }
  }

  for (let v of Object.keys(additionalPropertyMap)) {
    let label = v;
    let value = makeValue(filepath, metadata, additionalPropertyMap[v][1]);

    if (typeof value === 'string') {
      additionalInfos[label] = [additionalPropertyMap[v][0], value];
    }
  }

  for (let v of Object.keys(exifPropertyMap)) {
    let label = v;
    let value = makeValue(filepath, metadata, exifPropertyMap[v][1]);

    if (typeof value === 'string') {
      exifInfos[label] = [exifPropertyMap[v][0], value];
    }
  }
  
  return {
    fileInfos,
    additionalInfos,
    exifInfos,
  };
}
// photo-metadata-accessorの出力をもとに表示形式に変換した文字列リストを返す
async function getFormattedMetadataFiltered(metadata) {
}

module.exports = {
  getFormattedMetadataAll,
  getFormattedMetadataFiltered,
  getFormattedMetadataKeyAll
};

