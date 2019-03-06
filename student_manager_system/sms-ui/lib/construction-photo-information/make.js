'use strict';

// Node.js modules.
const path = require('path');

// 3rd-party modules.
const xml2js = require('xml2js');
const dateformat = require('dateformat');


function createEmptyConstructionInfo() {
  return { '写真情報': {} };
}

module.exports = {
  fromJacicXMP: function (metaData) {
    if(!Object.keys(metaData).length || !metaData["XMP:XMP"]) {
      return createEmptyConstructionInfo();
    }
    let result = {};
    let jacicXml = metaData["XMP:XMP"]["fieldValue"];
    if(typeof jacicXml !== "string" || jacicXml === "") {
      return createEmptyConstructionInfo();;
    }

    let jacicObj = null;
    xml2js.parseString(jacicXml, function(err, parseResult) {
      jacicObj = parseResult;
    });
    if(jacicObj === undefined) {
      return createEmptyConstructionInfo();;
    }
    let jacicDescription = jacicObj["x:xmpmeta"]["rdf:RDF"][0]["rdf:Description"][0];
    
    let photoInfo = {};
    if(jacicDescription["photo:Title"] !== undefined) {
      photoInfo["写真タイトル"] = jacicDescription["photo:Title"][0];
    }
    if(jacicDescription["photo:LargeClassification"] !== undefined) {
      photoInfo["写真-大分類"] = jacicDescription["photo:LargeClassification"][0];
    }
    if(jacicDescription["photo:PhotoClassification"] !== undefined) {
      photoInfo["写真区分"] = jacicDescription["photo:PhotoClassification"][0];
    }
    if(jacicDescription["photo:ConstructionType"] !== undefined) {
      photoInfo["工種"] = jacicDescription["photo:ConstructionType"][0];
    }
    if(jacicDescription["photo:MiddleClassification"] !== undefined) {
      photoInfo["種別"] = jacicDescription["photo:MiddleClassification"][0];
    }
    if(jacicDescription["photo:SmallClassification"] !== undefined) {
      photoInfo["細別"] = jacicDescription["photo:SmallClassification"][0];
    }
    if(jacicDescription["photo:IsFrequencyOfSubmission"] !== undefined) {
      photoInfo["提出頻度写真"] = jacicDescription["photo:IsFrequencyOfSubmission"][0] === "True" ? "1": "0";
    }
    if(jacicDescription["photo:IsRepresentative"] !== undefined) {
      photoInfo["代表写真"] = jacicDescription["photo:IsRepresentative"][0] === "True" ? "1": "0";
    }
    if(jacicDescription["photo:ShootingSpot"] !== undefined) {
      photoInfo["撮影箇所"] = jacicDescription["photo:ShootingSpot"][0];
    }
    if(jacicDescription["photo:ContractorRemarks"] !== undefined) {
      photoInfo["請負者説明文"] = jacicDescription["photo:ContractorRemarks"][0];
    }
    {
      let date;
      if (metaData.hasOwnProperty('EXIF:DateTimeOriginal')) {
        date = new Date(metaData['EXIF:DateTimeOriginal'].fieldValue);
      } else if (metaData.hasOwnProperty('EXIF:CreateDate')) {
        date = new Date(metaData['EXIF:CreateDate'].fieldValue);
      } else {
        date = new Date(metaData['FILE:FileDate'].fieldValue);
      }
      photoInfo['撮影年月日'] = dateformat(date, 'yyyy-mm-dd');
    }

    if(jacicDescription["photo:ClassificationRemarks"] !== undefined &&
        jacicDescription["photo:ClassificationRemarks"][0]["rdf:Seq"] !== undefined && 
        jacicDescription["photo:ClassificationRemarks"][0]["rdf:Seq"][0]["rdf:li"] !== undefined) {
      let remarks = jacicDescription["photo:ClassificationRemarks"][0]["rdf:Seq"][0]["rdf:li"];
      photoInfo["工種区分予備"] = "";
      for(let i = 0;i < remarks.length; i++) {
        if(i > 0) {
          photoInfo["工種区分予備"] += " ";
        }
        photoInfo["工種区分予備"] += remarks[i];
      }
    }

    if(jacicDescription["photo:Measurements"] !== undefined &&
        jacicDescription["photo:Measurements"][0]["rdf:Description"] !== undefined &&
        jacicDescription["photo:Measurements"][0]["rdf:Description"][0]["measurement:MeasurementItems"] !== undefined &&
        jacicDescription["photo:Measurements"][0]["rdf:Description"][0]["measurement:MeasurementItems"][0]["rdf:Seq"] !== undefined &&
        jacicDescription["photo:Measurements"][0]["rdf:Description"][0]["measurement:MeasurementItems"][0]["rdf:Seq"][0]["rdf:li"] !== undefined) {
      let rdf = jacicDescription["photo:Measurements"][0]["rdf:Description"][0]["measurement:MeasurementItems"][0]["rdf:Seq"][0]["rdf:li"];
      photoInfo["施工管理値"] = "";
      for(let j = 0;j < rdf.length; j++) {
        if(j > 0) {
          photoInfo["施工管理値"] += " ";
        }
        let item = rdf[j]["rdf:Description"][0];
        let k = 0;
        for(var key in item) {
          if(key !== "item:Remarks") {
            if(k > 0) {
              photoInfo["施工管理値"] += " ";
            }
            photoInfo["施工管理値"] += item[key];
            k++;
          }
        }
      }
    }
    
    result["写真情報"] = photoInfo;
    return result;
  },

  fromKuraemonKokuban: function (originalData) {
    if(!Object.keys(originalData).length) {
      return createEmptyConstructionInfo();;
    }
    let metaData = originalData[0];
    let result = {};
    let photoInfo = {};
    if(metaData["kokuban.organizeinfo.写真タイトル"] !== undefined) {
      photoInfo["写真タイトル"] = metaData["kokuban.organizeinfo.写真タイトル"]["fieldValue"];
    }
    if(metaData["kokuban.organizeinfo.写真-大分類"] !== undefined) {
      photoInfo["写真-大分類"] = metaData["kokuban.organizeinfo.写真-大分類"]["fieldValue"];
    } else if (metaData["kokuban.phototaginfo.1"] !== undefined) {
      photoInfo["写真-大分類"] = metaData["kokuban.phototaginfo.1"]["fieldValue"];
    }
    if(metaData["kokuban.organizeinfo.写真区分"] !== undefined) {
      photoInfo["写真区分"] = metaData["kokuban.organizeinfo.写真区分"]["fieldValue"];
    } else if (metaData["kokuban.phototaginfo.2"] !== undefined) {
      photoInfo["写真区分"] = metaData["kokuban.phototaginfo.2"]["fieldValue"];
    }
    if(metaData["kokuban.organizeinfo.工種"] !== undefined) {
      photoInfo["工種"] = metaData["kokuban.organizeinfo.工種"]["fieldValue"];
    } else if (metaData["kokuban.phototaginfo.3"] !== undefined) {
      photoInfo["工種"] = metaData["kokuban.phototaginfo.3"]["fieldValue"];
    }
    if(metaData["kokuban.organizeinfo.種別"] !== undefined) {
      photoInfo["種別"] = metaData["kokuban.organizeinfo.種別"]["fieldValue"];
    } else if (metaData["kokuban.phototaginfo.4"] !== undefined) {
      photoInfo["種別"] = metaData["kokuban.phototaginfo.4"]["fieldValue"];
    }
    if(metaData["kokuban.organizeinfo.細別"] !== undefined) {
      photoInfo["細別"] = metaData["kokuban.organizeinfo.細別"]["fieldValue"];
    } else if (metaData["kokuban.phototaginfo.5"] !== undefined) {
      photoInfo["細別"] = metaData["kokuban.phototaginfo.5"]["fieldValue"];
    }
    if(metaData["kokuban.isfrequencyofsubmission"] !== undefined) {
      photoInfo["提出頻度写真"] = metaData["kokuban.isfrequencyofsubmission"]["fieldValue"] === "true" ? "1": "0";
    }
    if(metaData["kokuban.isrepresentative"] !== undefined) {
      photoInfo["代表写真"] = metaData["kokuban.isrepresentative"]["fieldValue"] === "true" ? "1": "0";
    }
    let date;
    if (metaData.hasOwnProperty('EXIF:DateTimeOriginal')) {
      date = new Date(metaData['EXIF:DateTimeOriginal'].fieldValue);
    } else if (metaData.hasOwnProperty('EXIF:CreateDate')) {
      date = new Date(metaData['EXIF:CreateDate'].fieldValue);
    } else {
      date = new Date(metaData['FILE:FileDate'].fieldValue);
    }
    photoInfo["撮影年月日"] = dateformat(date, 'yyyy-mm-dd');
    
    result["写真情報"] = photoInfo;
    return result;
  },

  fromAlbumDetail: function (albumInfo) {
    if(!Object.keys(albumInfo).length) {
      return createEmptyConstructionInfo();;
    } else {
      let empty = true;
      for(let index in albumInfo.photoInfoTemplate) {
        if(albumInfo.photoInfoTemplate[index] !== "") {
          empty = false;
          break;
        }
      }
      if(empty) {
        return createEmptyConstructionInfo();;
      }
    }
    let result = {};
    let photoInfo = {};

    let photoInfoTemplate = albumInfo.photoInfoTemplate;
    if(photoInfoTemplate["largeClassification"] !== undefined) {
      photoInfo["写真-大分類"] = photoInfoTemplate["largeClassification"];
    }
    if(photoInfoTemplate["photoClassification"] !== undefined) {
      photoInfo["写真区分"] = photoInfoTemplate["photoClassification"];
    }
    if(photoInfoTemplate["constructionType"] !== undefined) {
      photoInfo["工種"] = photoInfoTemplate["constructionType"];
    }
    if(photoInfoTemplate["middleClassification"] !== undefined) {
      photoInfo["種別"] = photoInfoTemplate["middleClassification"];
    }
    if(photoInfoTemplate["smallClassification"] !== undefined) {
      photoInfo["細別"] = photoInfoTemplate["smallClassification"];
    }

    result["写真情報"] = photoInfo;
    return result;
  },

 };