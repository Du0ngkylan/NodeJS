
'use strict';

// Node.js modules.
const path = require('path');

// 3rd-parth modules.

// Goyo modules.



const requiredItems = [
  'FILE:OriginalName',
  'FILE:FileSize',
  //'FILE:OriginalDate',
  'FILE:FileDate',
  'FILE:ImageFormat',
  'FILE:HASH',
  'IMAGE:Width',
  'IMAGE:Height',
  'jacic.believability.image',
  'jacic.believability.date',
  // 'default'
];

const extraItems = [
  'FILE:OriginalName',
  'FILE:FileSize',
  //  'FILE:OriginalDate',
  'FILE:FileDate',
  'FILE:ImageFormat',
  'FILE:HASH',
  'IMAGE:Width',
  'IMAGE:Height',
  'IMAGE:BitPerComponent',
  //  'IMAGE:ColorComponents',
  'EXIF:Orientation',
  'EXIF:XResolution',
  'EXIF:YResolution',
  'EXIF:ResolutionUnit',
  'EXIF:TransferFunction',
  'EXIF:WhitePoint',
  'EXIF:PrimaryChromaticities',
  'EXIF:YCbCrCoefficients',
  'EXIF:ReferenceBlackWhite',
  'EXIF:ModifyDate',
  'EXIF:ImageDescription',
  'EXIF:Make',
  'EXIF:Model',
  'EXIF:Software',
  'EXIF:Artist',
  'EXIF:Copyright',
  'EXIF:ExifVersion',
  'EXIF:ColorSpace',
  'EXIF:ComponentsConfiguration',
  'EXIF:Compression',
  'EXIF:ExifImageWidth',
  'EXIF:ExifImageHeight',
  'EXIF:MakerNote',
  'EXIF:UserComment',
  'EXIF:DateTimeOriginal',
  'EXIF:CreateDate',
  'EXIF:ExposureTime',
  'EXIF:FNumber',
  'EXIF:ExposureProgram',
  'EXIF:ISO',
  'EXIF:ShutterSpeedValue',
  'EXIF:ApertureValue',
  'EXIF:BrightnessValue',
  'EXIF:ExposureCompensation',
  'EXIF:MaxApertureValue',
  'EXIF:SubjectDistance',
  'EXIF:MeteringMode',
  'EXIF:LightSource',
  'EXIF:Flash',
  'EXIF:FocalLength',
  'EXIF:FlashEnergy',
  'EXIF:SpectralSensitivity',
  'EXIF:OEFC',
  'EXIF:SpatialFrequencyResponse',
  'EXIF:FocalPlaneXResolution',
  'EXIF:FocalPlaneYResolution',
  'EXIF:FocalPlaneResolutionUnit',
  'EXIF:SubjectLocation',
  'EXIF:ExposureIndex',
  'EXIF:SensingMethod',
  'EXIF:FileSource',
  'EXIF:SceneType',
  'EXIF:CFAPattern',
  'EXIF:GPSVersionID',
  'EXIF:GPSLatitudeRef',
  'EXIF:GPSLatitude',
  'EXIF:GPSLongitudeRef',
  'EXIF:GPSLongitude',
  'EXIF:GPSAltitudeRef',
  'EXIF:GPSAltitude',
  'EXIF:GPSTimeStamp',
  'EXIF:GPSDateStamp',
  'jacic.kokuban',
  'jacic.believability.image',
  'jacic.believability.date',
  'kokuban.template.version',
  'kokuban.template.revision',
  'kokuban.template.typeid',
  'kokuban.fieldname.KoujiName',
  'kokuban.fieldname.AlbumName',
  'kokuban.fieldname.exInfo1',
  'kokuban.fieldname.exInfo2',
  'kokuban.fieldname.exInfo3',
  'kokuban.fieldname.exInfo4',
  'kokuban.fieldname.exInfo5',
  'kokuban.fieldname.exInfo6',
  'kokuban.fieldname.exInfo7',
  'kokuban.fieldname.exInfo8',
  'kokuban.fieldname.exInfo9',
  'kokuban.fieldname.KoujiComment',
  'kokuban.fieldname.date',
  'kokuban.fieldname.KoujiCompany',
  'kokuban.fieldname.工事名',
  'kokuban.fieldname.工種',
  'kokuban.fieldname.備考',
  'kokuban.organizeinfo.写真-大分類',
  'kokuban.organizeinfo.写真区分',
  'kokuban.organizeinfo.工種',
  'kokuban.organizeinfo.種別',
  'kokuban.organizeinfo.細別',
  'kokuban.organizeinfo.写真タイトル',
  'kokuban.isrepresentative',
  'kokuban.isfrequencyofsubmission',
  'kokuban.phototaginfo.1',
  'kokuban.phototaginfo.2',
  'kokuban.phototaginfo.3',
  'kokuban.phototaginfo.4',
  'kokuban.phototaginfo.5'
];

const textFrameItems = [
  'kokuban.template.version',
  'kokuban.template.revision',
  'kokuban.template.typeid',
  'kokuban.fieldname.KoujiName',
  'kokuban.fieldname.AlbumName',
  'kokuban.fieldname.exInfo1',
  'kokuban.fieldname.exInfo2',
  'kokuban.fieldname.exInfo3',
  'kokuban.fieldname.exInfo4',
  'kokuban.fieldname.exInfo5',
  'kokuban.fieldname.exInfo6',
  'kokuban.fieldname.exInfo7',
  'kokuban.fieldname.exInfo8',
  'kokuban.fieldname.exInfo9',
  'kokuban.fieldname.KoujiComment',
  'kokuban.fieldname.date',
  'kokuban.fieldname.KoujiCompany',
  'kokuban.fieldname.工事名',
  'kokuban.fieldname.工種',
  'kokuban.fieldname.備考',
  'kokuban.organizeinfo.写真-大分類',
  'kokuban.organizeinfo.写真区分',
  'kokuban.organizeinfo.工種',
  'kokuban.organizeinfo.種別',
  'kokuban.organizeinfo.細別',
  'kokuban.organizeinfo.写真タイトル',
  'kokuban.isrepresentative',
  'kokuban.isfrequencyofsubmission',
  'kokuban.phototaginfo.1',
  'kokuban.phototaginfo.2',
  'kokuban.phototaginfo.3',
  'kokuban.phototaginfo.4',
  'kokuban.phototaginfo.5'
  // 'default',
  // '{AlbumTemplrateID}-{frameID}'

];

var accessor = {
  getPhotoFrame: function (obj) {
    let photoFrame = {};

    photoFrame['photoFrameId'] = 0;
    photoFrame['imageFile'] = obj['FILE:OriginalName']['fieldValue'];
    photoFrame['fileArias'] = path.basename(obj['FILE:OriginalName']['fieldValue']);
    photoFrame['fileSize'] = Math.round(parseInt(obj['FILE:FileSize']['fieldValue'])/1024);
    photoFrame['width'] = obj['IMAGE:Width']['fieldValue'];
    photoFrame['height'] = obj['IMAGE:Height']['fieldValue'];
    if (obj.hasOwnProperty('EXIF:CreateDate')) {
      photoFrame['shootingDate'] = obj['EXIF:CreateDate']['fieldValue'];
    } else if (obj.hasOwnProperty('FIlE:FileDate')) {
      photoFrame['shootingDate'] = obj['FILE:FileDate']['fieldValue'];
    }

    let extraInfo = {};
    for (let i = 0; i < requiredItems.length; ++i) {
      let name = requiredItems[i];
      if (obj.hasOwnProperty(name) === false) {
        continue;
      }
      let val = obj[name];
      if (val['fieldValue'] === undefined) {
        continue;
      }
      extraInfo[name] = obj[name]['fieldValue'];
    }
    for (let i = 0; i < extraItems.length; ++i) {
      let name = extraItems[i];
      if (obj.hasOwnProperty(name) === false) {
        continue;
      }
      let val = obj[name];
      if (val['fieldValue'] === undefined) {
        continue;
      }
      extraInfo[name] = val['fieldValue'];
    }
    extraInfo['FILE:FileSize'] = photoFrame['fileSize'];
    photoFrame['extraInfo'] = extraInfo;
    return photoFrame;
  },
  getTextFrame: function (obj) {
    let textFrame = {};
    for (let i = 0; i < textFrameItems.length; ++i) {
      let name = textFrameItems[i];
      if (obj.hasOwnProperty(name) === false) {
        continue;
      }
      let val = obj[name];
      if (val['fieldValue'] === undefined) {
        continue;
      }
      val['hideSentence'] = 0;
      val['hideSentenceBackground'] = 0;
      textFrame[name] = val;
    }
    return textFrame;
  },
  makeAlbumFrame: function (obj, constructPhotoInfomation) {
    let albumFrame = {};
    albumFrame['referenceSouceAlbumFrameId'] = 0;
    albumFrame['referenceDiagramFilePath'] = "";
    albumFrame['constructionPhotoInformation'] = constructPhotoInfomation;
    let photoFrame = [];
    photoFrame.push(this.getPhotoFrame(obj));
    albumFrame['photoFrames'] = photoFrame;
    albumFrame['textFrames'] = this.getTextFrame(obj);
    //albumFrames.push(albumFrame);
    return albumFrame;
  },
  getAlbumFrame: function (photoMetadataResult, kuraemonKokuban, imagePath) {
    let obj = photoMetadataResult;
    let constructPhotoInfomation = kuraemonKokuban;
    obj['FILE:OriginalName']['fieldValue'] = imagePath;
    return this.makeAlbumFrame(obj, constructPhotoInfomation);
  }
};

module.exports = accessor;
