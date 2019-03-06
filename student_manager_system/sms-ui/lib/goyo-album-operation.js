'use strict';

// Node.js modules.
const writeFile = require('fs').writeFile;
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const promisify = require('util').promisify;

// Electron modules.
const { app } = require('electron');

// Goyo modules.
const goyoDialog = require('./goyo-dialog-utils');
const { plainImageMaker } = require('./goyo-utils');
const goyoAppDefaults = require('./goyo-app-defaults');
const bookrackAccessor = require('goyo-bookrack-accessor');
const goyoAlbumLayout = require('./layout/goyo-album-layout');
const { TextFrameFormatter } = require('./layout/goyo-text-frame-formatter');
const photoMetaDataAccessor = require('photo-metadata-accessor')
const goyoResources = require('goyo-resources');
const logger = require('./goyo-log')('goyo-album-operation');
const goyoTemporal = require('./goyo-temporal');
const makePhotoInfo = require('./construction-photo-information/make');
const programSettings = require('./goyo-program-settings');
const lockFactory = require('./lock-manager/goyo-lock-manager');
const goyo18DataReader = require('./goyo18-dataReader');
const { generatePhotoInformationMaker } = require('./photo-information-text');


// 3rd-parth modules.
const fse = require('fs-extra');
const sizeOf = promisify(require('image-size'));
const dateformat = require('dateformat');


// Constant values.
const THE_THRESHOLD_OF_USING_GET_ALBUM_FRAMES = 40;
const REQUIRED_ITEMS = [
  'FILE:OriginalName',
  'FILE:FileSize',
  //'FILE:OriginalDate',
  'FILE:FileDate',
  'FILE:ImageFormat',
  'FILE:HASH',
  'File:BitsPerSample',
  'File:ColorComponents',
  'IMAGE:Width',
  'IMAGE:Height',
  'jacic.believability.image',
  'jacic.believability.date',
  // 'default'
];
const EXTRA_ITEMS = [
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
  'XMP:XMP',
  'jacic.kokuban',
  'jacic.believability.image',
  'jacic.believability.date',
];
const RESERVED_FRAME_PHOTO = {
  imageFile: null,
  width: 0,
  height: 0,
  fileSize: 0
};



/*******************/
/*  Module object. */
/*******************/
var albumOperation = {
  lockManager : null,

  /*******************/
  /*  Initialize.    */
  /*******************/
  async initialize() {
    try {
      // initialize TPI file.
      let tpi = goyoResources.getTpiFrame(goyoResources.ALBUM_FRAME_TYPE_RESERVATION);
      let tmpTpi = await goyoTemporal.makeTemporal(tpi);
      let { width, height } = await sizeOf(tmpTpi);
      let s = await fse.stat(tmpTpi);
      RESERVED_FRAME_PHOTO.imageFile = tmpTpi;
      RESERVED_FRAME_PHOTO.width = width;
      RESERVED_FRAME_PHOTO.height = height;
      RESERVED_FRAME_PHOTO.fileSize = Math.floor(s.size / 1024);
    } catch(e) {
      logger.error('initialize', e);
    }
  },

  /*******************/
  /* common getters. */
  /*******************/
  get defaultAlbumSettings() {
    if (programSettings.otherSettings.defaultSettingType !== 0) {
      let userAlbumSetting = JSON.parse(JSON.stringify(programSettings.otherSettings.userLayoutSettings));
      if (!userAlbumSetting.photoInfoTemplate) {
        userAlbumSetting.photoInfoTemplate = {
          "largeClassification": "",
          "photoClassification": "",
          "constructionType": "",
          "middleClassification": "",
          "smallClassification": ""
        };
      }
      return userAlbumSetting;
    } else {
      return JSON.parse(JSON.stringify(goyoAppDefaults.createAlbumSettings));
    }
  },
  
  get emptyFrame() {
    return {
      constructionPhotoInformation: {},
      referenceDiagramFilePath: "",
      photoFrames: [],
      textFrames: {
        'visibility.sentence': makeTextFrameField('visibility.sentence', 'show'),
        'visibility.background': makeTextFrameField('visibility.background', 'show'),
        'goyo.photo.flip': makeTextFrameField('goyo.photo.flip', 'false'),
        'goyo.photo.rotate': makeTextFrameField('goyo.photo.rotate', '0'),
      },
    };
  },

  get reservedPhotoFrame() {
    let extname = path.extname(RESERVED_FRAME_PHOTO.imageFile);
    let photoFrame = {
      photoFrameId: 0,
      fileArias: dateformat(new Date(), 'yyyymmdd_HHMMssl') + extname,
    };

    return Object.assign(photoFrame, RESERVED_FRAME_PHOTO);
  },

  /*************************************/
  /* album operations without UI.      */
  /*************************************/
  createAlbums: async function(constructionId, parentItemId, siblingItemId=null, count=1, albumSettings=null, 
    albumTemplate=null, covers=null, siblingFlag='before', callback=()=>{}) {
    // get default albumSettings
    if (!albumSettings) {
      albumSettings = await this.defaultAlbumSettings;
    }
    if (!albumSettings.hasOwnProperty('photoInfoTemplate')) {
      albumSettings.photoInfoTemplate = {
        "largeClassification": "",
        "photoClassification": "",
        "constructionType": "",
        "middleClassification": "",
        "smallClassification": ""
      };
    }

    // cover option.
    if (albumSettings.hasOwnProperty("bookCoverOption")) {
      albumSettings.bookCoverOption.frontImagePosition = 1;
      albumSettings.bookCoverOption.reducedImagePosition = 1;
    }

    // prepare cover files
    if (!covers) {
      if (typeof albumSettings.bookCoverOption.bookCoverColorType === 'number') {
        covers = await this.prepareNewBookCoverFiles(albumSettings.bookCoverOption.bookCoverColorType);
      } else {
        covers = await this.prepareNewBookCoverFiles(0);
      }
    }

    if (!albumTemplate || albumTemplate == 0) {
      // from program settings
      if (albumSettings.layout && albumSettings.layout != 0) {
        albumTemplate = albumSettings.layout;
      } else {
        let layoutInfo = await goyoAlbumLayout.getLayoutInfo(goyoAlbumLayout.LAYOUT_TYPE_STANDARD, 1);
        albumTemplate = layoutInfo.path;  
      }
    }
    let albumTemplateTmp = await goyoTemporal.makeTemporal(albumTemplate);


    let bookrackTree = await bookrackAccessor.getBookrackItems(constructionId);
    if (typeof siblingItemId === 'number') {
      let siblingItem = findBookrackItem(siblingItemId, bookrackTree.bookrackItems);
      parentItemId = siblingItem.parentBookrackItemId;
    }
    let parentItem = findBookrackItem(parentItemId, bookrackTree.bookrackItems);

    let albumParameter = {
      "albumId" : 0,
      "parentBookrackItemId" : parentItemId,
      "displayNumber" : parentItem.bookrackItems.length,
      "albumType" : 0,
      "layout" : {
        "albumTemplate" : albumTemplateTmp,
      },
      "albumSettings" : albumSettings,
      "frontCover": covers.frontCover,
      "backCover": covers.backCover,
      "spineCover": covers.spineCover,
    };
    //logger.debug(albumParameter);
    
    //TODO:parameter name albumParameter.albumTotalCount = await getAlbumFrameFromAlbumTemplate(albumParameter);
    albumParameter.albumFrameTotalCount = await getAlbumFrameFromAlbumTemplate(albumParameter);

    let createdAlbumIds = [];
    try {
      for (let i = 0; i < count; i++) {
        let updateResult = await bookrackAccessor.updateAlbum(constructionId, albumParameter);
        let newAlbumId = updateResult.albumId;

        createdAlbumIds.push(newAlbumId);
        callback(i+1, newAlbumId);
      }
    } catch(e) {
      logger.error('failed to createAlbum', e);
      throw e;
    }

    if (typeof siblingItemId === 'number') {
      let index = parentItem.bookrackItems.findIndex(item => item.bookrackItemId === siblingItemId);
      if (index > 0) {
        if (siblingFlag === 'before') {
          Array.prototype.splice.apply(parentItem.bookrackItems, [index, 0].concat(createdAlbumIds.map(id=>{ return {bookrackItemId: id};})));
        } else {
          Array.prototype.splice.apply(parentItem.bookrackItems, [index + 1, 0].concat(createdAlbumIds.map(id=>{ return {bookrackItemId: id};})));
        }
        let newOrderedTree = JSON.parse(JSON.stringify(bookrackTree));
        removeOtherThanId(newOrderedTree);
        await bookrackAccessor.updateBookrackItemOrder(constructionId, newOrderedTree.bookrackItems);
      } else {
        if (siblingFlag === 'after') {
          Array.prototype.splice.apply(parentItem.bookrackItems, [index + 1, 0].concat(createdAlbumIds.map(id=>{ return {bookrackItemId: id};})));
          let newOrderedTree = JSON.parse(JSON.stringify(bookrackTree));
          removeOtherThanId(newOrderedTree);
          await bookrackAccessor.updateBookrackItemOrder(constructionId, newOrderedTree.bookrackItems);
        }
      }
    }

    this.emit('create-album', constructionId, createdAlbumIds, siblingItemId, siblingFlag);
    // cleanup
    // if (typeof albumSettings.bookCoverOption.bookCoverColorType === 'number') {
    //   await goyoTemporal.clearTemporal(covers.frontCover);
    //   await goyoTemporal.clearTemporal(covers.backCover);
    //   await goyoTemporal.clearTemporal(covers.spineCover);
    // }
    // await goyoTemporal.clearTemporal(albumTemplateTmp);

    return createdAlbumIds;
  },

  deleteAlbums: async function(constructionId, albumIds, canceller={ cancel:false }, callback=(done,total)=>{}) {
    let deletedIds = [];
    for (let albumId of albumIds) {
      if (canceller.cancel) { break; }
      try {
        let deleteResult = await bookrackAccessor.deleteAlbum(constructionId, albumId);
        deletedIds.push(deleteResult.albumId);
        callback(deletedIds.length, albumIds.length);
      } catch(e) {
        logger.error('deleteAlbums', albumId);
      }
    }
    this.emit('delete-album', constructionId, deletedIds);
    return deletedIds;
  },

  updateAlbumSetting: async function(constructionId, albumId, albumSettings, albumTemplate = null) {
    let covers;

    try {
      if (albumTemplate) {
        albumTemplate = await goyoTemporal.makeTemporal(albumTemplate);
      }

      covers = await this.prepareNewBookCoverFiles(albumSettings.bookCoverOption.bookCoverColorType);

      let albumParameter = {
        albumId,
        albumSettings,
        "layout" : {
          "albumTemplate" : albumTemplate,
          // if the albumTemplate is null, Backend uses current template.
        },
        "frontCover": covers.frontCover,
        "backCover": covers.backCover,
        "spineCover": covers.spineCover,
      };

      logger.debug('albumParameter');
      logger.debug(albumParameter);
      let updateResult = await bookrackAccessor.updateAlbum(constructionId, albumParameter);

      if (albumTemplate) {
        let layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumTemplate);
        let template = await layoutInfo.template;
        if (template.hasOwnProperty('defaultHeaderFooter')) {
          let defHF = template.defaultHeaderFooter;
          let { printDecorationSettings } = await bookrackAccessor.getPrintSettings(constructionId, albumId);

          printDecorationSettings.header.enable = 1;
          printDecorationSettings.header.left = defHF.leftTop;
          printDecorationSettings.header.center = defHF.centerTop;
          printDecorationSettings.header.right = defHF.rightTop;
          printDecorationSettings.footer.enable = 1;
          printDecorationSettings.footer.left = defHF.leftBottom;
          printDecorationSettings.footer.center = defHF.centerBottom;
          printDecorationSettings.footer.right = defHF.rightBottom;
          const printOperation = require('./print-operation');
          await printOperation.updatePrintSettings(constructionId, albumId, printDecorationSettings, null, null);
        }
      }

      this.emit('update-album-setting', constructionId, albumId, albumTemplate!=null);

      return true;
    } catch(e) {
      logger.error('updateAlbumSetting', e);
    } finally {
      Promise.all([
        goyoTemporal.clearTemporal(albumTemplate),
        goyoTemporal.clearTemporal(covers.frontCover),
        goyoTemporal.clearTemporal(covers.backCover),
        goyoTemporal.clearTemporal(covers.spineCover),
      ]).then(r => {});
    }
    return false;
  },

  /*************************************/
  /* frame operations without UI.      */
  /*************************************/
  insertEmptyFrames: async function(constructionId, albumId, count=1, targetFrameId=null, addAfter=false) {
    logger.trace(`insertEmptyFrames(count:${count}, targetFrameId:${targetFrameId})`);
    if (count<=0) return;

    let frames = Array.from({length:count}).map(() => this.emptyFrame);

    let result;
    try {
      result = await this.insertFrames(constructionId, albumId, frames, targetFrameId, addAfter);
    } catch(e) {
      throw e;
    }
    return result;
  },

  insertFrames: async function(constructionId, albumId, frames, targetFrameId=null, addAfter=false) {
    logger.trace(`insertFrames(count:${frames.length})`);
    let newBookmarks = [];
    let transaction = await beginTransaction(constructionId, albumId);
    try {
      let result = await bookrackAccessor.addAlbumFrames(constructionId, albumId, frames);
      var newFrameIds = result.success.map(f => f.albumFrameId);

      if (targetFrameId && targetFrameId > 0) {
        let resultAllAlbumFrames = await bookrackAccessor.getAlbumFrames(constructionId, albumId);

        let allFrameIds = resultAllAlbumFrames.albumFrames.map(f => f.albumFrameId);
        logger.debug(`allframeIds:${allFrameIds}`);
        logger.debug(`targetFrameId::${targetFrameId}`);

        let position = allFrameIds.findIndex(id => id === targetFrameId);
        if(addAfter) {
          position = parseInt(position) + 1;
        }
        if (position >= 0) {
          let first = allFrameIds.slice(0, position);
          let last = allFrameIds.slice(position, - newFrameIds.length);
          let reordered = [].concat(first, newFrameIds, last);
          logger.debug(`reordered: ${reordered}`);

          await bookrackAccessor.updateAlbumFrameOrder(constructionId, albumId, reordered);

          let needsUpdateBm = false;
          let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
          newBookmarks = bookmarks.filter(bm => position <= bm.albumFramePosition-1);
          newBookmarks.forEach(bm => bm.albumFramePosition += newFrameIds.length);
          //bookmarks.forEach(bm => {
          //  if (position <= bm.albumFramePosition) {
          //    bm.albumFramePosition += newFrameIds.length;
          //    needsUpdateBm = true;
          //  }
          //});
          //if (needsUpdateBm) {
          //  await this.updateBookmarks(constructionId, albumId, bookmarks);
          //}
        }

        await transaction.commit();
        this.emit('insert-frames', constructionId, albumId, newFrameIds, position);
      } else {
        await transaction.commit();
        this.emit('insert-frames', constructionId, albumId, newFrameIds, null);
      }
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    if (newBookmarks.length > 0) {
      await this.updateBookmarks(constructionId, albumId, newBookmarks);
    }
    return newFrameIds;
  },

  deleteFrames: async function(constructionId, albumId, frameIds, immediately=null, canceller={ cancel:false }, callback=(done,total)=>{}) {
    logger.trace(`deleteFrames(frameIds:${frameIds})`);
    let deletedIds = [];
    if (immediately == null) {
      immediately = programSettings.dataManagement.trashAlbum === 0;
    }

    // For replace or delete bookmarks.
    logger.trace("start getBookmarks");
    let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
    logger.trace("exit getBookmarks");

    logger.trace("start getAlbumFramesById");
    let frames = await getAlbumFramesById(constructionId, albumId, frameIds);
    logger.trace("exit getAlbumFramesById");

    logger.trace("start unlinkReferenceDiagramPatternBFrames");
    await this.unlinkReferenceDiagramPatternBFrames(constructionId, albumId, frameIds, frames);
    logger.trace("end unlinkReferenceDiagramPatternBFrames");

    let transaction = await beginTransaction(constructionId, albumId, immediately);
    try {
      // Sort frames descending order by displayNumber, in order to changing albumFramePosition of bookmarks.
      frames.sort((a,b) => b.displayNumber - a.displayNumber);
      for (let frame of frames) {
        if (canceller.cancel) { break; }

        try {
          // Decrement albumFramePosition where the albumFramePosition is greater than current frame displayNumber.
          bookmarks.forEach(bm => {
            if (bm.albumFramePosition === frame.displayNumber) {
              bm.albumFramePosition = -1;
            } else if (bm.albumFramePosition > frame.displayNumber) {
              bm.albumFramePosition--;
            } else { /* Do nothing. */ }
          });

          logger.trace("start deleteAlbumFrame");
          let deleteResult = await bookrackAccessor.deleteAlbumFrame(constructionId, albumId, frame.albumFrameId, immediately);
          deletedIds.push(deleteResult.albumFrameId);
          logger.trace("exit deleteAlbumFrame");

          callback(deletedIds.length, frameIds.length);
        } catch(e) {
          logger.error('deleteFrames', e);
        }
      }

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    // update bookmarks.
    await this.deleteBookmarks(constructionId, albumId, bookmarks.filter(bm=>bm.albumFramePosition===-1));
    await this.updateBookmarks(constructionId, albumId, bookmarks.filter(bm=>bm.albumFramePosition!==-1));

    this.emit('delete-frames', constructionId, albumId, deletedIds);

    return deletedIds;
  },

  deleteFramesAll: async function(constructionId, albumId, immediately=null, canceller={ cancel:false }, callback=(done,total)=>{}) {
    logger.trace(`deleteFramesAll()`);
    let deletedIds = [];
    if (immediately == null) {
      immediately = programSettings.dataManagement.trashAlbum === 0;
    }

    // For replace or delete bookmarks.
    let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
    let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);

    let transaction = await beginTransaction(constructionId, albumId, immediately);
    try {
      for (let frame of albumFrames) {
        if (canceller.cancel) { break; }

        try {
          let deleteResult = await bookrackAccessor.deleteAlbumFrame(constructionId, albumId, frame.albumFrameId, immediately);
          deletedIds.push(deleteResult.albumFrameId);

          callback(deletedIds.length, albumFrames.length);
        } catch(e) {
          logger.error('deleteFrames', e);
        }
      }

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    // update bookmarks.
    await this.deleteBookmarks(constructionId, albumId, bookmarks);

    this.emit('delete-frames', constructionId, albumId, deletedIds);

    return deletedIds;
  },

  updateFrames: async function(constructionId, albumId, frames, canceller={ cancel:false }, callback=(done,total)=>{}) {
    logger.trace(`updateFrames(frameIds:${frames.map(f=>f.albumFrameId)})`);
    let updatedIds = [];

    let transaction = await beginTransaction(constructionId, albumId);
    try {
      for (let frame of frames) {
        if (canceller.cancel) { break; }

        try {
          await bookrackAccessor.updateAlbumFrames(constructionId, albumId, [frame]);
          updatedIds.push(frame.albumFrameId);
          callback(updatedIds.length, frames.length);
        } catch(e) {
          logger.error('updateFrames', e);
        }
      }

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    this.emit('update-frames', constructionId, albumId, updatedIds);
    return updatedIds;
  },

  makeAlbumFrames: async function(fileList, mode='KuraemonKokuban', albumDetail=null, callback=(done,total)=>{}, knack=null) {
    let metaDataList = await photoMetaDataAccessor.getPhotoMetadata(fileList, ()=> {
      //callback();
    });
    let sortedMetadataList = sortByCurrentSetting(metaDataList.results, fileList);
    let albumFrames = await Promise.all(sortedMetadataList.map(async (mdata) => {
      let cpi;
      let filePath;
      if (mdata.hasOwnProperty('SourceFile')) {
        filePath = mdata.SourceFile.fieldValue;
      } else {
        filePath = mdata['FILE:OriginalName'].fieldValue;
      }
      let cpi18;
      let txt18;
      if(await goyo18DataReader.isGoyo18DataExits(filePath)){
        let goyo18Data = await goyo18DataReader.readData(filePath);
        if(goyo18Data){
          goyo18Data.xml? cpi18 = goyo18Data.xml:null;
          goyo18Data.txt? txt18 = goyo18Data.txt:null;
        }
      }
      switch(mode) {
        case 'KuraemonKokuban':
          cpi = makePhotoInfo.fromKuraemonKokuban([mdata]);
          break;
        case 'Album':
          if (!albumDetail || !albumDetail.albumSettings) {
            albumDetail = { albumSettings: goyoAppDefaults.createAlbumSettings };
          }
          if(cpi18){
            cpi = cpi18;
            break;
          }
          cpi = makePhotoInfo.fromAlbumDetail(albumDetail.albumSettings);
          break;
        case 'JacicXMP':
          cpi = makePhotoInfo.fromJacicXMP(mdata);
          break;
        case 'Reference':
          cpi = {"参考図情報": {
            '写真ファイル名': null,
            '参考図タイトル': '',
            '付加情報予備': '',
          }};
          break;
        default:
          assert(false);
      }
      if (programSettings.importImage.title==1 && mode!=='Reference') {
        if (!cpi['写真情報'].hasOwnProperty('写真タイトル') || cpi['写真情報']['写真タイトル']==='') {
          // NOTE: This field will be replaced with value of 'photoFrames[0].fileArias' by bookrackAccessor.
          //       In order to make file name unique in a album.
          let ext = path.extname(mdata['FILE:OriginalName'].fieldValue);
          cpi['写真情報']['写真タイトル'] = '{{fileArias}}';
        }
        if (!cpi['写真情報'].hasOwnProperty('撮影年月日') || cpi['写真情報']['撮影年月日']==='') {
          let date;
          if (mdata.hasOwnProperty('EXIF:DateTimeOriginal')) {
            date = new Date(mdata['EXIF:DateTimeOriginal'].fieldValue);
          } else if (mdata.hasOwnProperty('EXIF:CreateDate')) {
            date = new Date(mdata['EXIF:CreateDate'].fieldValue);
          } else {
            date = new Date(mdata['FILE:FileDate'].fieldValue);
          }
          cpi['写真情報']['撮影年月日'] = dateformat(date, 'yyyy-mm-dd');
        }
      }
      let textFrames = this.makeTextFrames(mdata);
      txt18? textFrames = Object.assign({'comment':makeTextFrameField('comment',txt18)},textFrames):null;

      let albumFrame = {
        albumFrameId: 0,
        referenceSouceAlbumFrameId: 0,
        referenceDiagramFilePath: '',
        constructionPhotoInformation: cpi,
        photoFrames: [this.makePhotoFrame(mdata)],
        textFrames,
      };

      if (knack) {
        albumFrame.illegalInfos = await this.checkFrame(knack, albumFrame);
      }
      //callback(completedCount++, sortedMetadataList.length);
      return albumFrame;
    }));

    return albumFrames;
  },

  makePhotoFrame: function(mdata) {
    let photoFrame = {};

    photoFrame['photoFrameId'] = 0;
    photoFrame['imageFile'] = mdata['FILE:OriginalName']['fieldValue'];
    photoFrame['fileArias'] = path.basename(mdata['FILE:OriginalName']['fieldValue']);
    photoFrame['fileSize'] = Math.floor(parseInt(mdata['FILE:FileSize']['fieldValue'])/1024);
    photoFrame['width'] = mdata['IMAGE:Width']['fieldValue'];
    photoFrame['height'] = mdata['IMAGE:Height']['fieldValue'];
    if (mdata.hasOwnProperty('EXIF:DateTimeOriginal')) {
      photoFrame['shootingDate'] = mdata['EXIF:DateTimeOriginal']['fieldValue'];
    } else if (mdata.hasOwnProperty('EXIF:CreateDate')) {
      photoFrame['shootingDate'] = mdata['EXIF:CreateDate']['fieldValue'];
    } else if (mdata.hasOwnProperty('FILE:FileDate')) {
      photoFrame['shootingDate'] = mdata['FILE:FileDate']['fieldValue'].replace(/\.\d\d\d$/, '');
    } else {
      photoFrame['shootingDate'] = '';
    }

    let extraInfo = {};
    for (let key of REQUIRED_ITEMS) {
      if (mdata.hasOwnProperty(key) && mdata[key]['fieldValue'] != null) {
        extraInfo[key] = mdata[key]['fieldValue'];
      }
    }
    for (let key of EXTRA_ITEMS) {
      if (mdata.hasOwnProperty(key) && mdata[key]['fieldValue'] != null) {
        extraInfo[key] = mdata[key]['fieldValue'];
      }
    }
    for (let key in mdata) {
      if (key.startsWith('kokuban.')) {
        extraInfo[key] = mdata[key]['fieldValue'];
      }
    }
    photoFrame['extraInfo'] = extraInfo;

    return photoFrame;
  },

  makeTextFrames: function(mdata) {
    let textFrames = {};
    let flip = 'false';
    let rotate = '0';

    for (let key in mdata) {
      if (key.startsWith('kokuban.')) {
        textFrames[key] = makeTextFrameField(key, mdata[key].fieldValue, mdata[key].fieldLabel || key);
      }
    }

    if (programSettings.importImage.imageRotate==1 && mdata.hasOwnProperty('EXIF:Orientation')) {
      switch(mdata['EXIF:Orientation'].fieldValue) {
        case 'Mirror horizontal':
          flip = 'true';
          break;
        case '180度回転':
          rotate = '180';
          break;
        case 'Mirror vertical':
          flip = 'true';
          rotate = '180';
          break;
        case 'Mirror horizontal and rotate 270 CW':
          flip = 'true';
          rotate = '270';
          break;
        case '90度回転 CW':
          rotate = '90';
          break;
        case 'Mirror horizontal and rotate 90 CW':
          flip = 'true';
          rotate = '90';
          break;
        case '270度回転 CW':
          rotate = '270';
          break;
        case 1:
        default:
          break;
      }
    }

    textFrames['visibility.sentence'] = makeTextFrameField('visibility.sentence', 'show');
    textFrames['visibility.background'] = makeTextFrameField('visibility.background', 'show');
    textFrames['goyo.photo.flip'] = makeTextFrameField('goyo.photo.flip', flip);
    textFrames['goyo.photo.rotate'] = makeTextFrameField('goyo.photo.rotate', rotate);
    return textFrames;
  },

  replaceAndInsertFrames: async function(constructionId, albumId, newFrames, frameId=null, canceller={cancel:false}, callback=(done,total)=>{}, after=false, resultFrames={ successFrames : [], errorFrames : []}) {
    logger.trace(`replaceAndInsertFrames(count:${newFrames.length})`);
    let successFrames = resultFrames.successFrames;
    let errorFrames = resultFrames.errorFrames;
    let insertCount = 0;
    let albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
    let resultFrameIds = [];
    let newIds;

    let newBookmarks = [];
    let transaction = await beginTransaction(constructionId, albumId);
    let shortage = 0;
    try {

      // 1. 指定フレームから連続している空きフレームを更新
      // 1. Updates consecutive empty frames which starts from a position of frameId.
      if (frameId) {
        var position = albumFrames.findIndex(f => f.albumFrameId === frameId);
        if (position >= 0) {
          position += (after) ? 1 : 0;
          let updateFrames = [];

          while (insertCount < newFrames.length && position < albumFrames.length &&
            albumFrames[position].photoFrames.length === 0) {

            delete newFrames[insertCount].albumFrameId;
            updateFrames.push(Object.assign(albumFrames[position], newFrames[insertCount]));
            resultFrameIds.push(albumFrames[position].albumFrameId);
            position++;
            insertCount++;
          }

          if (updateFrames.length>0) {
            for (let i = 0; i < updateFrames.length; i++) {
              if (canceller.cancel) break;
              let targetFrame = updateFrames.slice(i,i+1);
              try {
                await bookrackAccessor.updateAlbumFrames(constructionId, albumId, targetFrame);
                callback(i+1, newFrames.length);
                successFrames.push({
                  albumFrame : targetFrame[0]
                });
              } catch(e) {
                logger.error(`replaceAndInsertFrames: updateFrames for frameId=${frameId}`, e);
                errorFrames.push({
                  albumFrame : targetFrame[0],
                  errorMessage : e.message
                });
              }
            }
          }
        }
      }

      let upIndex=0;
      let upCount=0;
      if (!canceller.cancel) {
        upIndex = findIndexOfEveryTrailing(albumFrames, f => f.photoFrames.length==0);

        // 2. 空きフレームが足りない場合は末尾に追加
        // 2. Adds empty frames at tail of album if the empty frame is not enough.
        shortage = (newFrames.length - insertCount) - (albumFrames.length - upIndex);
        if (shortage > 0) {
          try {
            for (let i = 0; i < shortage; i++) {
              if (canceller.cancel) break;

              let newEmptyFrame = this.emptyFrame;
              let addResult = await bookrackAccessor.addAlbumFrames(constructionId, albumId, [newEmptyFrame]);
              if (addResult.success.length > 0) {
                newEmptyFrame.albumFrameId = addResult.success[0].albumFrameId;
                albumFrames.push(newEmptyFrame);
              }
            }
          } catch(e) {
            logger.error('addAlbumFrames', e);
          }
        }
      }

      // 3. 末尾の連続する空きフレームへ書き込み
      // 3. Updates consecutive empty frames which is located at tail of album.
      let beforeSuccessCount = successFrames.length;
      if (!canceller.cancel) {
        let updateFrames = [];

        while (insertCount + upCount < newFrames.length && upIndex+upCount < albumFrames.length) {
          delete newFrames[insertCount+upCount].albumFrameId;
          updateFrames.push(Object.assign(albumFrames[upIndex+upCount], newFrames[insertCount+upCount]));
          resultFrameIds.push(albumFrames[upIndex+upCount].albumFrameId);
          upCount++;
        }

        if (updateFrames.length>0) {
          for (let i = 0; i < updateFrames.length; i++) {
            if (canceller.cancel) break;
            let targetFrame = updateFrames.slice(i,i+1);
            try {
              await bookrackAccessor.updateAlbumFrames(constructionId, albumId, targetFrame);
              callback(insertCount+i+1, newFrames.length);
              successFrames.push({
                albumFrame : targetFrame[0]
              });
            } catch(e) {
              logger.error(`replaceAndInsertFrames: updateFrames for emptyFrameIdx=${upIndex}`, e);
              errorFrames.push({
                albumFrame : targetFrame[0],
                errorMessage : e.message
              });
            }
          }
        }
      }

      // 3.5 キャンセルされた場合に不要な空きフレームを削除
      if (canceller.cancel) {
        let origFrameIds = albumFrames.map(f => f.albumFrameId);
        let tailSucceed = successFrames.length - beforeSuccessCount;
        let emptyFrameCount = shortage - tailSucceed;
        let emptyFrameIds = origFrameIds.splice(-(emptyFrameCount), emptyFrameCount);
        let immediately = programSettings.dataManagement.trashAlbum === 0;
        for (let emptyFrameId of emptyFrameIds) {
          await bookrackAccessor.deleteAlbumFrame(constructionId, albumId, emptyFrameId, immediately);
        }
        albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
        upCount = tailSucceed;
      }

      // 4. 上記の2,3のフレームを1の直後に移動
      // 4. Moves frames of 2,3 onto the position just after the frames of 1.
      if (frameId && position < albumFrames.length && upCount>0) {
        // No cancel this procedure even if user click cancel button.

        let origFrameIds = albumFrames.map(f => f.albumFrameId)
        let updatedFrameIds = origFrameIds.splice(upIndex, upCount);

        let first  = origFrameIds.slice(0, position);
        let last  = origFrameIds.slice(position);

        newIds = [].concat(first, updatedFrameIds, last);

        try {
          await bookrackAccessor.updateAlbumFrameOrder(constructionId, albumId, newIds);

          let needsUpdateBm = false;
          let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
          newBookmarks = bookmarks.filter(bm => position <= bm.albumFramePosition-1);
          newBookmarks.forEach(bm => bm.albumFramePosition += upCount);
          //bookmarks.forEach(bm => {
          //  if (position <= bm.albumFramePosition) {
          //    bm.albumFramePosition += upCount;
          //    needsUpdateBm = true;
          //  }
          //});
          //if (needsUpdateBm) {
          //  await this.updateBookmarks(constructionId, albumId, bookmarks);
          //}
        } catch(e) {
          logger.error(`replaceAndInsertFrames: updateAlbumFrameOrder`, e);
          // continue the procedure.
        }
      }

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    if (newIds) {
      this.emit('reorder-frames', constructionId, albumId, newIds)
    }
    this.emit('update-frames', constructionId, albumId, resultFrameIds)

    if (newBookmarks.length > 0) {
      await this.updateBookmarks(constructionId, albumId, newBookmarks);
    }

    return resultFrameIds;
  },

  changeFramesToEmpty: async function(constructionId, albumId, canceller={cancel:false}, callback=(done,total)=>{}) {
    let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);
    let frameIds = albumFrames.map(f => f.albumFrameId);
    let immediately = programSettings.dataManagement.trashAlbum === 0;

    let newFrameIds = [];

    let transaction = await beginTransaction(constructionId, albumId, immediately);
    try {

      for (let frameId of frameIds) {
        if (canceller.cancel) break;

        await bookrackAccessor.deleteAlbumFrame(constructionId, albumId, frameId, immediately);
        let addResult = await bookrackAccessor.addAlbumFrames(constructionId, albumId, [this.emptyFrame]);
        newFrameIds.push(addResult.success[0].albumFrameId);
        callback(newFrameIds.length, frameIds.length);
      }

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    this.emit('insert-frames', constructionId, albumId, newFrameIds, 0);
    this.emit('delete-frames', constructionId, albumId, frameIds);
    return newFrameIds;
  },

  updateFrameOrder: async function(constructionId, albumId, frames) {
    // NOTE: This method has following function.
    //   * re-locate bookmarks along with reordering 'frames'.
    //   * insert empty frames if 'frames' has frame whose albumFrameId is 0.

    logger.trace(`updateFrameOrder(count:${frames.length})`);

    let { bookmarks } = await bookrackAccessor.getBookmarks(constructionId, albumId);
    bookmarks.forEach(bm => {
      let newIndex = frames.findIndex(f => f.displayNumber === bm.albumFramePosition);
      bm.albumFramePosition = newIndex + 1;
    });

    let transaction = await beginTransaction(constructionId, albumId);
    try {

      // Add empty frames if a frame which is albumFrameId equals 0 exists.
      let newFrames = frames.filter(f => f.albumFrameId===0);
      if (newFrames.length > 0) {
        let empties = Array.from({length:newFrames.length}).map(() => this.emptyFrame);
        let result = await bookrackAccessor.addAlbumFrames(constructionId, albumId, empties);
        for (let i=0; i<newFrames.length; i++) {
          newFrames[i].albumFrameId = result.success[i].albumFrameId;
        }
      }

      // extract only frame ID and run reorder.
      let frameIds = frames.map(f => f.albumFrameId);
      await bookrackAccessor.updateAlbumFrameOrder(constructionId, albumId, frameIds);

      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    this.emit('reorder-frames', constructionId, albumId, frames.map(f => f.albumFrameId));
    await this.deleteBookmarks(constructionId, albumId, bookmarks.filter(bm=>bm.albumFramePosition===0));
    await this.updateBookmarks(constructionId, albumId, bookmarks.filter(bm=>bm.albumFramePosition!==0));
  },

  /*************************************/
  /* bookmark operations without UI.   */
  /*************************************/
  addBookmarks: async function(constructionId, albumId, bookmarks) {
    let results = [];
    let transaction = await beginTransaction(constructionId, albumId);
    try {
      let promises = bookmarks.map(bm => {
        bm.bookmarkId = 0;
        return bookrackAccessor.updateBookmark(constructionId, albumId, bm)
          .then(r => {
            bm.bookmarkId = r.bookmarkId;
            return bm;
          })
          .catch(e => logger.error('addBookmarks', e));
      });

      results = await Promise.all(promises);
      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    results = results.filter(r => r!=null);
    if (results.length > 0) {
      this.emit('update-bookmarks');
    }

    return results;
  },

  updateBookmarks: async function(constructionId, albumId, bookmarks) {
    let results = [];
    let transaction = await beginTransaction(constructionId, albumId);
    try {
      let promises = bookmarks.map(bm => {
        return bookrackAccessor.updateBookmark(constructionId, albumId, bm)
          .then(r => bm)
          .catch(e => logger.error('updateBookmarks', e));
      });

      results = await Promise.all(promises);
      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    results = results.filter(r => r!=null);
    if (results.length > 0) {
      this.emit('update-bookmarks');
    }

    return results;
  },

  deleteBookmarks: async function(constructionId, albumId, bookmarks) {
    let results = [];
    let transaction = await beginTransaction(constructionId, albumId);
    try {
      let promises = bookmarks.map(bm => {
        return bookrackAccessor.deleteBookmark(constructionId, albumId, bm.bookmarkId)
          .then(r => bm)
          .catch(e => logger.error('deleteBookmarks', e));
      });

      results = await Promise.all(promises);
      await transaction.commit();
    } catch(e) {
      await transaction.rollback();
      throw e;
    }

    results = results.filter(r => r!=null); // exclude errored bookmarks.
    if (results.length > 0) {
      this.emit('update-bookmarks');
    }

    return results;
  },

  /*************************************/
  /* frame operations with UI.         */
  /*************************************/
  editFrameSettings: async function (parent, constructionId, albumId, frameId, key=null, textFormat=null, textValue=null) {

    try {
      var albumFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)).albumFrame;
    } catch(e) {
      logger.error('editFrameSettings', e);
      return false;
    }

    try {
      let isAddReservedPhoto = albumFrame.photoFrames.hasOwnProperty(0) === false;
      let photoFrame = isAddReservedPhoto ?
        this.reservedPhotoFrame : albumFrame.photoFrames[0];

      let textFrame;
      if (key !=null && albumFrame.textFrames.hasOwnProperty(key)) {
        textFrame = albumFrame.textFrames[key];
      } else if (key !=null && textValue !=null) {
        textFrame = makeTextFrameField(key, textValue);
      } else if (key !=null && textFormat !=null) {
        let { construction } = await bookrackAccessor.getConstructionDetail(constructionId, false);
        let { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        let albumInfoManager = { albumInfo: {
          constructionName: construction.constructionName,
          albumName: albumDetail.albumSettings.albumName,
        }};
        let formatter = new TextFrameFormatter(albumInfoManager, (cpi) => '');
        textValue = formatter.format(textFormat, albumFrame, 0);
        textFrame = makeTextFrameField(key, textValue);
      } else {
        textFrame = null;
      }

      if (!albumFrame.textFrames.hasOwnProperty('visibility.sentence')) {
        albumFrame.textFrames['visibility.sentence'] = makeTextFrameField('visibility.sentence', 'show');
      }
      if(!albumFrame.textFrames.hasOwnProperty('visibility.background')) {
        albumFrame.textFrames['visibility.background'] = makeTextFrameField('visibility.background', 'show');
      }
      let hideSentence = albumFrame.textFrames['visibility.sentence'].fieldValue;
      let hideSentenceBackground = albumFrame.textFrames['visibility.background'].fieldValue;

      let zoom = programSettings.globalFrameSettings.zoom;
      let newSetting = await goyoDialog.showFrameInformationDialog(
        parent, { photoFrame, textFrame, albumFrame, zoom, hideSentence, hideSentenceBackground });
      if (newSetting == null) {
        return false;
      }

      // add reservedPhotoFrame
      if (isAddReservedPhoto) {
        // lock exclusive construction
        try {
          await this.lockExclusiveConstruction(constructionId);
        } catch(e) {
          if (e.message == 'another host name already exists') {
            await goyoDialog.showConstructionLockBusyDialog(parent);
            return;  
          } else {
            throw e;
          }
        }
      }
      
      let newAlbumFrame = albumFrame;
      newAlbumFrame.photoFrames[0] = newSetting.photoFrame;
      newAlbumFrame.textFrames[key] = newSetting.textFrame;
      newAlbumFrame.textFrames['visibility.sentence'].fieldValue = newSetting.hideSentence;
      newAlbumFrame.textFrames['visibility.background'].fieldValue = newSetting.hideSentenceBackground;

      if(newSetting.applyAll) {
        let albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId)).albumFrames;
        let newAlbumFrames = [];

        for(let index in albumFrames) {
          if(albumFrames[index].albumFrameId === newAlbumFrame.albumFrameId) {
            newAlbumFrames.push(newAlbumFrame);
          } else if(albumFrames[index].textFrames !== undefined) {
            if (albumFrames[index].textFrames.hasOwnProperty('visibility.sentence')) {
              albumFrames[index].textFrames['visibility.sentence'].fieldValue = newSetting.hideSentence;
            } else {
              albumFrames[index].textFrames['visibility.sentence'] = makeTextFrameField('visibility.sentence', newSetting.hideSentence);
            }
            if (albumFrames[index].textFrames.hasOwnProperty('visibility.sentenceBackground')) {
              albumFrames[index].textFrames['visibility.sentenceBackground'].fieldValue = newSetting.hideSentenceBackground;
            } else {
              albumFrames[index].textFrames['visibility.sentenceBackground'] = makeTextFrameField('visibility.sentenceBackground', newSetting.hideSentenceBackground);
            }
            newAlbumFrames.push(albumFrames[index]);
          }
        }
        await this.updateFrames(constructionId, albumId, newAlbumFrames);
      } else {
        await this.updateFrames(constructionId, albumId, [newAlbumFrame]);
      }
      if(newAlbumFrame.referenceSouceAlbumFrameId !== 0) {
        let albumFrameSources = [];
        let referenceFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, newAlbumFrame.referenceSouceAlbumFrameId)).albumFrame;
        albumFrameSources.push(referenceFrame);
        if(newAlbumFrame.constructionPhotoInformation['参考図情報'].hasOwnProperty('参照元フレーム') &&
            newAlbumFrame.constructionPhotoInformation['参考図情報']['参照元フレーム'] !== null) {
          for(let albumFrameSource of newAlbumFrame.constructionPhotoInformation['参考図情報']['参照元フレーム']) {
            referenceFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, albumFrameSource.albumFrameSourceId)).albumFrame;
            albumFrameSources.push(referenceFrame);
          }
        }
        await this.updateFrames(constructionId, albumId, albumFrameSources);
      }
      if(newAlbumFrame.constructionPhotoInformation !== undefined &&
        newAlbumFrame.constructionPhotoInformation !== null &&
        newAlbumFrame.constructionPhotoInformation['写真情報'] !== undefined &&
        newAlbumFrame.constructionPhotoInformation['写真情報'] !== undefined &&
          newAlbumFrame.constructionPhotoInformation['写真情報'].hasOwnProperty("参考図") &&
          newAlbumFrame.constructionPhotoInformation['写真情報']['参考図'].length > 0) {
        let albumFrameSources = [];
        for(let albumFrameSource of newAlbumFrame.constructionPhotoInformation['写真情報']['参考図']) {
          let referenceDiagramFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, albumFrameSource.referenceDiagramAlbumFrameId)).albumFrame;
          albumFrameSources.push(referenceDiagramFrame);
        }
        await this.updateFrames(constructionId, albumId, albumFrameSources);
      }
      if(zoom !== newSetting.zoom) {
        let newProgramSetting = {
          backupSettings: programSettings.backupSettings,
          dataManagement: programSettings.dataManagement,
          displayImage: programSettings.displayImage,
          displaySettings: programSettings.displaySettings,
          imageDetermination: programSettings.imageDetermination,
          importImage: programSettings.importImage,
          menuSettings: programSettings.menuSettings,
          otherSettings: programSettings.otherSettings,
          globalFrameSettings: {zoom: newSetting.zoom},
          clipart : programSettings.clipart,
        }; 
        await bookrackAccessor.updateProgramSettings(newProgramSetting);
        await programSettings.initialize();
      }

      return true;
    } catch(e) {
      logger.error('editFrameInformation', e);
      await goyoDialog.showErrorMessageDialog(parent, 'エラー', 'フレームの更新に失敗しました', 'OK');
      return false;
    } finally {
      await this.unLockExclusiveConstruction();
    }
  },

  lockExclusiveConstruction: async function(constructionId) {
    // acquire exclusive lock
    this.lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
    await this.lockManager.lockAlbumItemDatabase(true);
  },

  unLockExclusiveConstruction: async function() {
    if (this.lockManager != null) {
      try {
        // release exclusive lock
        await this.lockManager.lockAlbumItemDatabase(false);
      } catch(e) {
        // do nothing...
      }
    }
  },

  editPhotoInformation: async function(parent, constructionId, albumId, frameId) {
    // Please catch an exceptions by caller of this function.

    let { construction } = await bookrackAccessor.getConstructionDetail(constructionId, false);

    let { albumFrame } = await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId);
    let history = await bookrackAccessor.getAlbumConstructionPhotoInformations(constructionId, albumId);
    let oldAlbumFrame = JSON.parse(JSON.stringify(albumFrame));
    let newSetting = await goyoDialog.showPhotoInformationDialog(parent, construction.knack, albumFrame, history, constructionId, albumId, construction.photoInformationTags);
    if (!newSetting) {
      return false;
    }
    let imageFile='';
    if (albumFrame.photoFrames.length === 0) {
      // lock exclusive construction
      try {
        await this.lockExclusiveConstruction(constructionId);
      } catch(e) {
        if (e.message == 'another host name already exists') {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return false;  
        } else {
          throw e;
        }
      }      
      albumFrame.photoFrames.push(this.reservedPhotoFrame);
    }
    imageFile = albumFrame.photoFrames[0].imageFile;
    if (imageFile.toLocaleLowerCase().endsWith('.tpi')) {
      imageFile = '';
    }

    try{

      let updateFrames = [];
      let addFrames = [];
      if(newSetting.hasOwnProperty("参考図")) {
        let oldIdList = [];
        let addList = [];
        let changeList = [];
        let deleteList = [];
        if(oldAlbumFrame.constructionPhotoInformation != null && oldAlbumFrame.constructionPhotoInformation.hasOwnProperty("写真情報")) {
          if(oldAlbumFrame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図")) {
            for(let oldInfo of oldAlbumFrame.constructionPhotoInformation["写真情報"]["参考図"]) {
              oldIdList.push(oldInfo.referenceDiagramAlbumFrameId);
            }
          }
        }
        for(let index in newSetting["参考図"]) {
          if(newSetting["参考図"][index].referenceDiagramAlbumFrameId === 0) {
            addList.push([index, newSetting["参考図"][index]]);
            continue;
          }
          let idIndex = oldIdList.indexOf(newSetting["参考図"][index].referenceDiagramAlbumFrameId);
          if(idIndex != -1) {
            changeList.push([index, newSetting["参考図"][index]]);
            delete oldIdList[idIndex];
            continue;
          }
        }
        if(oldAlbumFrame.constructionPhotoInformation != null && oldAlbumFrame.constructionPhotoInformation.hasOwnProperty("写真情報")) {
          if(oldAlbumFrame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図")) {
            for(let oldDel of oldAlbumFrame.constructionPhotoInformation["写真情報"]["参考図"]) {
              if(oldIdList.indexOf(oldDel.referenceDiagramAlbumFrameId) > -1) {
                deleteList.push(oldDel);
              }
            }
          }
        }
        let albumDetailResult = null;
        if(addList.length > 0) {
          albumDetailResult = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        }
        if(addList.length > 0 || deleteList.length > 0) {
          await this.lockExclusiveConstruction(constructionId);
        }
        for(let add of addList) {
          logger.debug(`await this.insertEmptyFrames(${constructionId},${albumId},${frameId})`);
          let index = add[0];
          let newFrame = (await this.makeAlbumFrames([add[1]["参考図ファイル名"]], 'Reference', null))[0];
          let photoInfo = null;
          if(construction.knack.knackType === 3) {
            photoInfo = {
              '写真ファイル名': imageFile,
              'メモ１': newSetting["参考図"][index]['メモ１'],
              'メモ２': newSetting["参考図"][index]['メモ２'],
            };
          } else {
            photoInfo = {
              '写真ファイル名': imageFile,
              '参考図タイトル': newSetting["参考図"][index]['参考図タイトル'],
              '付加情報予備': newSetting["参考図"][index]['付加情報予備'],
            };
          }
          
          newFrame.constructionPhotoInformation["参考図情報"] = photoInfo;
          newFrame.referenceSouceAlbumFrameId = frameId;
          addFrames.unshift(newFrame);
        }
        if (addFrames.length > 0) {
          logger.debug(`await this.replaceAndInsertFrames(${constructionId},${albumId}...`);
          let newIds = await this.replaceAndInsertFrames(
            constructionId, albumId,
            addFrames, frameId,
            { cancel: false}, () => {}, true
          );  

          for (let idx in addList) {
            let refIdx = addList[idx][0];
            newSetting['参考図'][refIdx].referenceDiagramAlbumFrameId = newIds[idx];
          }
        }
        for(let change of changeList) {
          let changeFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, change[1].referenceDiagramAlbumFrameId)).albumFrame;
          let index = change[0];
          if(changeFrame.constructionPhotoInformation["参考図情報"]) {
            if(construction.knack.knackType === 3) {
              changeFrame.constructionPhotoInformation["参考図情報"]['メモ１'] = newSetting["参考図"][index]['メモ１'];
              changeFrame.constructionPhotoInformation["参考図情報"]['メモ２'] = newSetting["参考図"][index]['メモ２'];
            } else {
              changeFrame.constructionPhotoInformation["参考図情報"]['参考図タイトル'] = newSetting["参考図"][index]['参考図タイトル'];
              changeFrame.constructionPhotoInformation["参考図情報"]['付加情報予備'] = newSetting["参考図"][index]['付加情報予備'];
            }
          }
          
          updateFrames.push(changeFrame);
        }
        let otherAlbumFrameId = oldAlbumFrame.albumFrameId;
        for(let del of deleteList) {
          let delFrame = (await bookrackAccessor.getAlbumFrame(constructionId, albumId, del.referenceDiagramAlbumFrameId)).albumFrame;          
          logger.debug(`this.unlinkOtherAlbumFrame(${otherAlbumFrameId}...`);
          this.unlinkOtherAlbumFrame(otherAlbumFrameId, delFrame);
          updateFrames.push(delFrame);
        }
      }
      albumFrame.constructionPhotoInformation = {
        '写真情報': newSetting
      };
      updateFrames.push(albumFrame);

      logger.debug(`await this.updateFrames(${constructionId},${albumId}...`);
      await this.updateFrames(constructionId, albumId, updateFrames);

      return true;
    } catch (e) {
      if (e.message == 'another host name already exists') {
        await goyoDialog.showConstructionLockBusyDialog(parent);
      }
      logger.error('editPhotoInformation error: ', e);
    } finally {
      await this.unLockExclusiveConstruction();
    }
  },

  unlinkOtherAlbumFrame(otherAlbumFrameId, albumFrameRefPatternB) {
    // ここに指定されるのは参考図Bパターンフレーム
    let referenceSouceAlbumFrameId = 0;
    let oldConstructionPhotoInfor = albumFrameRefPatternB.constructionPhotoInformation;
    if (oldConstructionPhotoInfor==null) return;
    logger.debug('current frame');
    logger.debug(JSON.stringify(albumFrameRefPatternB,null,2));

    if (albumFrameRefPatternB.referenceSouceAlbumFrameId === otherAlbumFrameId) {
      // リンクを解除する場合に、参照元フレームに要素が存在する場合は
      // 参照元フレームの要素を参考図情報の写真ファイル名、referenceSouceAlbumFrameIdへ格上げする
      if (oldConstructionPhotoInfor.hasOwnProperty('参考図情報')
        && oldConstructionPhotoInfor['参考図情報'].hasOwnProperty('参照元フレーム')
        && Array.isArray(oldConstructionPhotoInfor['参考図情報']['参照元フレーム'])
        ) {
          for (let ref of oldConstructionPhotoInfor['参考図情報']['参照元フレーム']) {
            if (Number.isInteger(ref["albumFrameSourceId"]) 
              && ref["写真ファイル名"] != null) {
                oldConstructionPhotoInfor['参考図情報']['写真ファイル名'] = ref["写真ファイル名"];
                referenceSouceAlbumFrameId = parseInt(ref["albumFrameSourceId"]);
                oldConstructionPhotoInfor['参考図情報']['参照元フレーム'] = oldConstructionPhotoInfor['参考図情報']['参照元フレーム'].filter((i) => i.albumFrameSourceId !== ref["albumFrameSourceId"]);
                break;
            }
          }
      }
      if (referenceSouceAlbumFrameId == 0) {
        albumFrameRefPatternB.constructionPhotoInformation = {
          "写真情報": {}
        };  
      } else {
        albumFrameRefPatternB.constructionPhotoInformation = oldConstructionPhotoInfor;  
      }
      albumFrameRefPatternB.referenceSouceAlbumFrameId = referenceSouceAlbumFrameId;
    } else {
      // 参照元フレーム内にリンクが存在する場合は
      // 配列内から該当要素を削除することでリンクを解除する
      if (oldConstructionPhotoInfor.hasOwnProperty('参考図情報')
        && oldConstructionPhotoInfor['参考図情報'].hasOwnProperty('参照元フレーム')
        && Array.isArray(oldConstructionPhotoInfor['参考図情報']['参照元フレーム'])
        ) {
        
        for (let ref of oldConstructionPhotoInfor['参考図情報']['参照元フレーム']) {
          if (ref["albumFrameSourceId"] === otherAlbumFrameId) {
            oldConstructionPhotoInfor['参考図情報']['参照元フレーム']
              = oldConstructionPhotoInfor['参考図情報']['参照元フレーム'].filter((i) => i.albumFrameSourceId !== ref["albumFrameSourceId"]);
            break;
          }
        }
        albumFrameRefPatternB.constructionPhotoInformation = oldConstructionPhotoInfor;
      }
    }
    logger.debug('unlinked frame');
    logger.debug(JSON.stringify(albumFrameRefPatternB,null,2));

  },

  editReferenceInformation: async function(parent, constructionId, albumId, frameId) {
    let { construction } = await bookrackAccessor.getConstructionDetail(constructionId, false);
    let { albumFrame } = await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId);
    let cpi = albumFrame.constructionPhotoInformation;

    if (!cpi || !cpi.hasOwnProperty('参考図情報')) {
      cpi = { '参考図情報' : {} };
    }

    let param = {};
    param.knack = construction.knack;
    param.title = cpi['参考図情報']['参考図タイトル'] || '';
    param.budget = cpi['参考図情報']['付加情報予備'] || '';
    param.memo1 = cpi['参考図情報']['メモ１'] || '';
    param.memo2 = cpi['参考図情報']['メモ２'] || '';
    let result = await goyoDialog.showReferenceSettingDialog(parent, param);
    if (!result) {
      return;
    }

    cpi['参考図情報']['参考図タイトル'] = result.title;
    cpi['参考図情報']['付加情報予備'] = result.budget;
    cpi['参考図情報']['メモ１'] = result.memo1;
    cpi['参考図情報']['メモ２'] = result.memo2;
    albumFrame.constructionPhotoInformation = cpi;

    await this.updateFrames(constructionId, albumId, [albumFrame]);
  },

  addPlainImage: async function (parent, constructionId, albumId, frameIds) {
    let tempPath = null;
    let progressWindow = null;
    try {
      let result = await goyoDialog.showPlainImageCreatingDialog(parent);

      if (result !== null) {
        logger.debug(result);
        let image = result;

        let png =
          plainImageMaker
          .make(image.width, image.height, 
            image.color.r, image.color.g, image.color.b, 0)
          .toPNG({
            scaleFactor: 1.0
          });

        const now = new Date();
        const date = dateformat(now, "yyyymmdd");
        const time = dateformat(now, "HHMMss");
        tempPath = goyoTemporal.makeTemporalPathFromFileName(`${date}_${time}.png`);
        fs.writeFileSync(tempPath, png);
        logger.debug(tempPath);

        // show progress dialog.
        progressWindow = goyoDialog.showProgressDialog(parent);
        progressWindow.setProgress(0);

        // make album frames, sort them and ignore errors.
        let albumDetailResult = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        let newFrames = await this.makeAlbumFrames([tempPath], 'Album', albumDetailResult.albumDetail, (done,total)=> {
          progressWindow.setProgress(done / total+1);
        });
        
        // insert new frame into the album.
        await this.replaceAndInsertFrames(
          constructionId,
          albumId,
          newFrames,
          (frameIds.length > 0) ? frameIds[0] : undefined,
          ()=>{}, (done,total)=>{
            progressWindow.setProgress(done+1 / total+1);
          });
      }
    } catch (e) {
      logger.error('addPlainImage error: ', e);
    } finally {
      if (progressWindow != null) {
        await progressWindow.close();
      }
      if (tempPath != null) {
        goyoTemporal.clearTemporal(tempPath);
      }
    }
  },

  splitAlbum: async function (parent, target) {
    let albumDetails = await target.albumDetails;
    let bookrackItems = await target.bookrackItems;
    let template = path.join(albumDetails[0].layout.albumTemplate, 'albumtemplateG.json');
    let templateJson = JSON.parse(await fse.readFile(template, 'utf8'));
    let left = templateJson.leftPageBlockCount;
    let right = templateJson.rightPageBlockCount;
    let maxPageNumber = Math.ceil(albumDetails[0].frameTotalCount / (left + right)) * 2 - 2;
    let albumname = albumDetails[0].albumSettings.albumName;
    let newAlbumName = albumname + '@';
    let splitPageNumber = 2;
    if(maxPageNumber === 0) {
      await goyoDialog.showSimpleMessageDialog(parent, '情報', '2ページのアルバムでは、この操作は行えません。', 'OK');
      return;
    }
    let result = await goyoDialog.showSplitAlbumDialog(parent, albumname, newAlbumName, splitPageNumber, maxPageNumber);
    let splitNumber = result.splitPageNumber;
    let bookrackItemCurrent = findBookrackItem(albumDetails[0].albumId, bookrackItems);
    let newAlbumDetails = Object.assign({}, albumDetails[0]);
    newAlbumDetails.albumId = 0;
    newAlbumDetails.albumSettings.albumName = newAlbumName;
    newAlbumDetails.parentBookrackItemId = bookrackItemCurrent.parentBookrackItemId;
    newAlbumDetails.albumSettings.initialPageNumber = 0;
    delete newAlbumDetails.frameTotalCount;
    const canceller = { cancel: false };
    let progressWindow;
    if (splitNumber) {
      progressWindow = goyoDialog.showProgressDialog(parent, () => {
        canceller.cancel = true;
      });
      let constructionId = target.constructionId;
      let lockAlbumIds = new Set();
      let unLockAlbums = ()=> {
        lockAlbumIds.forEach((aId)=> {
          this.lockManager.lockAlbum(aId, false)
          .then(()=>{})
          .catch((e)=>{logger.errror('Failed to unlockAlbum', e);});
        });
        lockAlbumIds.clear();
      };
      
      // lock exclusive construction
      try {
        await this.lockExclusiveConstruction(constructionId);
      } catch(e) {
        if (e.message == 'another host name already exists') {
          await goyoDialog.showConstructionLockBusyDialog(parent);
          return;
        } else {
          throw e;
        }
      }
      
      try {
        let newNumberFrame = 0;
        let resultUpdateAlbum = await this.createAlbums(constructionId,
          bookrackItemCurrent.parentBookrackItemId, 
          bookrackItemCurrent.bookrackItemId, 1, 
          newAlbumDetails.albumSettings, 
          newAlbumDetails.layout.albumTemplate, null, 'after');

        // lock albums
        try {
          let albumIds = [ albumDetails[0].albumId, resultUpdateAlbum[0]];
          for (let aId of albumIds) {
            if (await this.lockManager.lockAlbum(aId, true)) {
              lockAlbumIds.add(aId);
            } else {
              throw new Error('lock busy');
            } 
          }  
        } catch (e) {
          unLockAlbums();
          await this.unLockExclusiveConstruction(constructionId);  
          await goyoDialog.showAlbumLockBusyDialog(parent);
          return;
        }

        logger.debug("start getAlbumFrames");
        let albumFrameCurrent = (await bookrackAccessor.getAlbumFrames(target.constructionId, albumDetails[0].albumId)).albumFrames;
        for (let i = 1; i <= splitNumber; i = i + 2) { 
          newNumberFrame += (left + right);
        }
        logger.debug("end getAlbumFrames");

        // insert to new album
        const BATCH_COUNT = 300;
        let arrNewAlbumFrame = albumFrameCurrent.splice(newNumberFrame);
        // acquire the frame id before splice
        const deleteFrameIds = arrNewAlbumFrame.reduce((arr, frame) => {
          arr.push(frame.albumFrameId);
          return arr;
        }, []);
        let moveTotal = arrNewAlbumFrame.length * 2;

        let done = 0;
        while (0 < arrNewAlbumFrame.length) {
          let insertGroupAlbumFrames = arrNewAlbumFrame.splice(0, BATCH_COUNT);
          logger.info(`insertGroupAlbumFrames.length=${insertGroupAlbumFrames.length}`);
          await this.insertFrames(target.constructionId, resultUpdateAlbum[0], insertGroupAlbumFrames);
          done += insertGroupAlbumFrames.length;
          progressWindow.setProgress(done / moveTotal);
        }

        await this.deleteFrames(target.constructionId, albumDetails[0].albumId, deleteFrameIds, true, canceller,(d,t) => {
          done++;
          progressWindow.setProgress(done / moveTotal);
        });

        if (!canceller.cancel) {
          progressWindow.setProgress(1);
        }
      } catch (error) {
        logger.error('', error);
      } finally {
        if(progressWindow) {
          await progressWindow.close();
        }
        unLockAlbums();
        await this.unLockExclusiveConstruction(constructionId);
      }
    }
  },
  mergeAlbum: async function (parent, target) {
    const confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent, '質問', 'アルバムに他のアルバムを足し合わせた場合、アルバムのレイアウトは足し合わせ元のアルバムのレイアウトに統一されます。足し合わせてよろしいですか？', 'はい(&Y)', 'いいえ(&N)');
    if (confirm) {
      const targetAlbumId = target.albumIds[0];
      const constructionId = target.constructionId;
      const totalAlbums = getAllAlbumsFromBookrackItems(await target.bookrackItems);
      let albums = JSON.parse(JSON.stringify(totalAlbums));
      for (let i = 0; i < albums.length; i++) {
        let albumFrame = await bookrackAccessor.getAlbumFrames(constructionId, albums[i].bookrackItemId, 0, 1);
        albums[i].frameTotalCount = albumFrame.albumFrameTotalCount;
      }
      let constTarget = {albumId: targetAlbumId, allAlbums: albums};
      const originalAlbumId = await goyoDialog.showMergeAlbumsDialog(parent, constTarget);
      let lockAlbumIds = new Set();
      if (originalAlbumId) {
        let unLockAlbums = ()=> {
          lockAlbumIds.forEach((aId)=> {
            this.lockManager.lockAlbum(aId, false)
            .then(()=>{})
            .catch((e)=>{logger.errror('Failed to unlockAlbum', e);});
          });
        };

        // lock exclusive construction
        try {
          await this.lockExclusiveConstruction(constructionId);
        } catch(e) {
          if (e.message == 'another host name already exists') {
            await goyoDialog.showConstructionLockBusyDialog(parent);
            return;  
          } else {
            throw e;
          }
        }

        // lock albums
        try {
          let albumIds = [ originalAlbumId, targetAlbumId];
          for (let aId of albumIds) {
            if (await this.lockManager.lockAlbum(aId, true)) {
              lockAlbumIds.add(aId);
            } else {
              throw new Error('lock busy')
            }
          }

        } catch (e) {
          unLockAlbums();
          await this.unLockExclusiveConstruction(constructionId);
          await goyoDialog.showAlbumLockBusyDialog(parent);
          return;
        }

        try {
          const { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, originalAlbumId);
          const { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, originalAlbumId, 0, albumDetail.frameTotalCount);
          await this.insertFrames(constructionId, targetAlbumId, albumFrames);

          if (lockAlbumIds.has(originalAlbumId)) {
            lockAlbumIds.delete(originalAlbumId);
            await this.lockManager.lockAlbum(originalAlbumId, false)
            .catch((e)=>{logger.errror('Failed to unlockAlbum', e);});
          }

          await this.deleteAlbumWithProgressDialog(parent, constructionId, originalAlbumId, albumFrames);
        } catch (error) {    
          logger.error('ALBUM:COMBINE', error);
          throw error;
        } finally {
          unLockAlbums();
          await this.unLockExclusiveConstruction(constructionId);
        }
      }
    }
  },

  deleteAlbumWithProgressDialog: async function (parent, constructionId, albumId, albumFrames, immediately=null) {
    if (!albumFrames) {
      const { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
      albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId, 0, albumDetail.frameTotalCount)).albumFrames;
    }
    const albumFrameIds = albumFrames.reduce((arr, albumFrame) => {
      arr.push(albumFrame.albumFrameId);
      return arr;
    }, []);
    const canceller = { cancel: false };
    const progressWindow = goyoDialog.showProgressDialog(parent, () => {
      canceller.cancel = true;
    });
    await this.deleteFrames(constructionId, albumId, albumFrameIds, immediately, canceller, (done,total) => {
      progressWindow.setProgress(done / (total+1));
    });
    if (!canceller.cancel) {
      await this.deleteAlbums(constructionId, [albumId]);
      progressWindow.setProgress(1);
    }
    await progressWindow.close();
  },

  deleteAlbumWithProgressCallback: async function (parent, constructionId, albumId, albumFrames, canceller, callback, immediately=null) {
    if (!albumFrames) {
      const { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
      albumFrames = (await bookrackAccessor.getAlbumFrames(constructionId, albumId, 0, albumDetail.frameTotalCount)).albumFrames;
    }
    const albumFrameIds = albumFrames.reduce((arr, albumFrame) => {
      arr.push(albumFrame.albumFrameId);
      return arr;
    }, []);
    if (canceller == null) {
      canceller = { cancel: false };
    }
    await this.deleteFrames(constructionId, albumId, albumFrameIds, immediately, canceller, (done,total) => {
      callback(done / (total+1));
    });
    if (!canceller.cancel) {
      await this.deleteAlbums(constructionId, [albumId]);
      callback(1);
    }

  },

  replaceAndInsertFramesWithProgress: async function(
    parent,
    constructionId,
    albumId,
    fileList,
    mode,
    frameId=null,
    after=false)
  {
    // Show progress window.
    let canceller = { cancel: false };
    let progressWindow = goyoDialog.showProgressDialog(parent, () => {
      canceller.cancel = true;
    });
    progressWindow.setProgress(0);

    try {
      let knack=null;
      if (programSettings.imageDetermination.verifyWhileReading == 1) {
        let ci = await bookrackAccessor.getConstructionDetail(constructionId);
        knack = ci.construction.knack
      }

      // Make album frames, sort them and ignore errors.
      let albumDetailResult = {albumDetail:null};
      if (mode==='Album') {
        albumDetailResult = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
      }
      let newFrames = await this.makeAlbumFrames(fileList, mode, albumDetailResult.albumDetail, (done, total) => {
        progressWindow.setProgress(done / (2 * fileList.length));
      }, knack);

      // Add album frames.
      var resultIds = await this.replaceAndInsertFrames(
        constructionId,
        albumId,
        newFrames,
        frameId,
        canceller,
        (done, total) => {
          progressWindow.setProgress((fileList.length + done) / (fileList.length + newFrames.length));
        });

      await progressWindow.close();
      progressWindow = null;

      // Show illegal photos.
      if (programSettings.imageDetermination.verifyWhileReading == 1) {
        let frameInfos = resultIds.map((fid,idx) => {
          return {
            albumId: albumId,
            frameId: fid,
            albumFrame: newFrames[idx],
            illegalInfos: newFrames[idx].illegalInfos,
          };
        });
        let result = await this.showIllegalFrames(constructionId, frameInfos);
        return {
          showIllegals: !result,
          newFrameIds: resultIds,
        };
      }
      return {
        showIllegals: false,
        newFrameIds: resultIds,
      };
    } finally {
      if (progressWindow) {
        await progressWindow.close();
      }
    }
  },

  adjustPageNumber: async function (parent, target) {
    const constructionId = target.constructionId;
    const albumId = target.albumIds[0];
    const { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
    const templatePath = albumDetail.layout.albumTemplate;
    const template = JSON.parse(await fse.readFile(path.join(templatePath, 'albumtemplateG.json')));
    const framePerSpread = template.leftPageBlockCount + template.rightPageBlockCount;
    const frameTotalCount = albumDetail.frameTotalCount;
    const targetPageCount = await goyoDialog.showAdjustPageNumberAlbumDialog(parent, {
      frameTotalCount: frameTotalCount,
      framePerSpread: framePerSpread
    });
    const currentPageCount = Math.ceil(frameTotalCount / framePerSpread) * 2;
    const targetFrameCount = framePerSpread * (targetPageCount / 2);
    if (targetPageCount && currentPageCount != targetPageCount) {
      if (targetPageCount > currentPageCount) {
        const emptyFrameCount = (targetPageCount - currentPageCount) / 2 * framePerSpread;
        await this.insertEmptyFrames(constructionId, albumId, emptyFrameCount);
        logger.info(`Insert ${emptyFrameCount} empty frames to constructionId - ${constructionId}, albumId - ${albumId}`);
      } else {
        let wait = require('./goyo-utils').waitEffect(parent);
        let frameIds = [];
        try {
          const { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId, targetFrameCount);
          for(let i=0; i<albumFrames.length; i++){
            if(albumFrames[i].photoFrames[0] && albumFrames[i].photoFrames[0].fileArias){
              let confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent, 'フレーム削除確認', 'ページ数を減らすと、いくつかの画像が削除されます。\nよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
              if (!confirm) return;
              confirm = await goyoDialog.showSimpleBinaryQuestionDialog(parent, 'フレーム削除確認', '本当に実行してよろしいですか？', 'はい(&Y)', 'いいえ(&N)', false);
              if (!confirm) return;
              break;
            }
          }
          frameIds = albumFrames.reduce((arr, frame) => {
            arr.push(frame.albumFrameId);
            return arr;
          }, []);
        } finally {
          wait.release()
        }
        const canceller = { cancel: false };
        const progressWindow = goyoDialog.showProgressDialog(parent, () => {
          canceller.cancel = true;
        });

        try {
          await this.deleteFrames(constructionId, albumId, frameIds, null, canceller, (done,total) => {
            progressWindow.setProgress(done / (total+1));
          });
        } finally {
          if (progressWindow != null) {
            await progressWindow.close();
          }
          logger.info(`Delete from constructionId - ${constructionId}, albumId - ${albumId}: ${JSON.stringify(frameIds)}`);
        }
      }
    }
  },

  unlinkReferenceDiagramPatternBFrames: async function (constructionId, albumId, frameIds, baseFrames=[]) {
    let unlinkTargets = [];

    async function getUnlinkTarget(frameId) {
      let result = unlinkTargets.find(f => f.albumFrameId === frameId);
      if (result) return result;

      result = baseFrames.find(f => f.albumFrameId === frameId);
      if (result) {
        return result;
      }

      try {
        let resultGet = await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId)
        if (resultGet.albumFrame.constructionPhotoInformation!=null && resultGet.albumFrame.displayNumber > 0) {
          return resultGet.albumFrame;
        } else {
          return null;
        }
      } catch(e) {
        return null;
      }
    }
    function addUnlinkTarget(frame) {
      let idx = unlinkTargets.findIndex(f => f.albumFrameId === frame.albumFrameId);
      if (idx >= 0) {
        unlinkTargets[idx] = frame;
      } else {
        unlinkTargets.push(frame);
      }
    }

    for (let frameId of frameIds) {
      let frame = await getUnlinkTarget(frameId);
      if (frame == null || frame.constructionPhotoInformation == null) continue;

      let cpi = frame.constructionPhotoInformation;
      if (cpi.hasOwnProperty('写真情報') && cpi['写真情報'].hasOwnProperty('参考図')) {
        let referenceDiagrams = cpi['写真情報']['参考図'];

        for (let referenceDiagram of referenceDiagrams) {
          let otherFrameId = referenceDiagram.referenceDiagramAlbumFrameId;
          let otherAlbumFrame = await getUnlinkTarget(otherFrameId);
          if (otherAlbumFrame) {
            logger.debug(`reference diagram pattern B add=${otherAlbumFrame.albumFrameId}`);
            this.unlinkOtherAlbumFrame(frame.albumFrameId, otherAlbumFrame);
            addUnlinkTarget(otherAlbumFrame);
          }
        }

        delete cpi['写真情報']['参考図'];
        addUnlinkTarget(frame);
      } else if (cpi.hasOwnProperty('参考図情報')) {
        // 参考図Bパターン自身を削除する場合
        // ・リンクされている参照元のすべてのフレームから参考図の情報を削除する
        // ・参考図Bパターン自体は通常フレームに戻す

        let refFrameIds = [ frame.referenceSouceAlbumFrameId ];          
        if (cpi['参考図情報'].hasOwnProperty('参照元フレーム')
          && Array.isArray(cpi['参考図情報']['参照元フレーム'])) {

          for (let ref of cpi['参考図情報']['参照元フレーム']) {
            if (Number.isInteger(ref['albumFrameSourceId'])) {
              refFrameIds.push(parseInt(ref['albumFrameSourceId']));
            }
          }
        }
        logger.debug(`remove 参考元フレーム：${JSON.stringify(refFrameIds)}`);

        for (let refFrameId of refFrameIds) {
          let refFrame = await getUnlinkTarget(refFrameId);
          if (refFrame==null) continue;

          let refCpi = refFrame.constructionPhotoInformation;
          // 該当する参考図とのリンクを解除する
          if(refCpi != null
            && refCpi.hasOwnProperty("写真情報")
            && refCpi["写真情報"].hasOwnProperty("参考図")
            && Array.isArray(refCpi["写真情報"]["参考図"]))
          {

            refCpi["写真情報"]["参考図"] 
              = refCpi["写真情報"]["参考図"].filter((i) => i.referenceDiagramAlbumFrameId !== frameId);

            addUnlinkTarget(refFrame);
          }
        }

        frame.constructionPhotoInformation = { '写真情報': {} };
        addUnlinkTarget(frame);
      }
    }

    await this.updateFrames(constructionId, albumId, unlinkTargets);
  },

  prepareNewBookCoverFiles :async function(colorType) {

    const files = [
      'aa_7.jpg',
      'aa_6.jpg',
      'aa_9.jpg',
      'aa_10.jpg',
      'aa_11.jpg',
      'aa_8.jpg',
      'aa_0.jpg',
      'aa_1.jpg',
      'aa_2.jpg',
      'aa_3.jpg',
      'aa_4.jpg',
      'aa_5.jpg',
      'ac_0.jpg',
      'ac_1.jpg',
      'ac_2.jpg',
      'ac_3.jpg',
      'ac_4.jpg',
      'ac_5.jpg',
      'ac_6.jpg',
      'ac_7.jpg',
      'ac_8.jpg',
      'ac_9.jpg',
      'atom_076.jpg',
      'atom_077.jpg',
      'atom_078.jpg',
      'atom_079.jpg',
      'atom_098.jpg',
      'atom_099.jpg',
    ];
  
    const resourceFolder = path.join( __dirname, '..', 'resources', 'COVER');
  
    // covers
    let f = files[colorType];
    let srcFront = path.join(resourceFolder, 'FRONT', f);
    let srcBack  = path.join(resourceFolder, 'BACK', f);
    let srcSpine = path.join(resourceFolder, 'SPINE', f);
  
    let frontCover = await  goyoTemporal.makeTemporal(srcFront);
    let backCover = await  goyoTemporal.makeTemporal(srcBack);
    let spineCover = await  goyoTemporal.makeTemporal(srcSpine);
    return { frontCover, backCover, spineCover };
  },

  showIllegalFrames: async function(constructionId, frameInfos) {
    const photoMetadataUtils = require('./photo-metadata-utils');
    let { construction } = await bookrackAccessor.getConstructionDetail(constructionId, false);

    let resultPromises = frameInfos.map(async (fi) => {
      try {
        if (fi.illegalInfos == null) {
          if (fi.albumFrame == null) {
            let { albumFrame } = await bookrackAccessor.getAlbumFrame(constructionId, fi.albumId, fi.frameId);
            fi.albumFrame = albumFrame;
          }
          fi.illegalInfos = await this.checkFrame(construction.knack, fi.albumFrame);
        }
      } catch(e) {
        return null;
      }

      if (fi.illegalInfos.length > 0) {
        let viewInfo = {
          albumId: fi.albumId,
          frameId: fi.frameId,
          fileArias: fi.albumFrame.photoFrames[0].fileArias,
          extraInfo: fi.albumFrame.photoFrames[0].extraInfo,
          illegals: fi.illegalInfos,
        }
        Object.defineProperty(viewInfo, 'text', { get: makeText });
        return viewInfo;
      } else {
        return null;
      }
    });
    let results = (await Promise.all(resultPromises)).filter(r => r!==null);
    logger.debug(`showIllegalFrames: ${results}`);

    if (results.length > 0) {
      const goyoInteractive = require('./goyo-interactive-album-view');
      await goyoInteractive.startAlbumFrameView(
        null, constructionId, results);
      return false;
    } else {
      return true;
    }

    function makeText() {
      if (this._text == null) {
        this._text = this.illegals.join('\n') + '\n\n' + metadataToText(this.fileArias, this.extraInfo);
        logger.debug(this.illegals);
        logger.debug(this._text);
      }
      return this._text;
    }
    function metadataToText(imageFile, extraInfo) {
      let result = '';
      let formatted =
        photoMetadataUtils.getFormattedMetadataAll(imageFile, extraInfo);

      let fileInfoText =
        formatted.fileInfos.map(fi => `【${fi.label}】${fi.value}`).join('\n');
      if (fileInfoText !== '') {
        result += '<<一般的な情報>>\n' + fileInfoText;
      }

      let additionalInfoText =
        formatted.additionalInfos.map(fi => `【${fi.label}】${fi.value}`)
        .join('\n');
      let exifInfoText =
        formatted.exifInfos.map(fi => `【${fi.label}】${fi.value}`).join('\n');
      if (exifInfoText !== '' || additionalInfoText !== '') {
        result += '\n<<付加情報>>\n' + additionalInfoText + exifInfoText;
      }

      return result;
    }
  },

  checkFrame: async function(knack, albumFrame) {
    if (albumFrame.photoFrames.length === 0) {
      return [];
    }
    let knackType = knack.knackType;
    let knackId = knack.knackId;
    let extraInfo = albumFrame.photoFrames[0].extraInfo;

    let illegals = [];
    switch (knackType) {
      case 6:
        if (parseInt(extraInfo['EXIF:ExifVersion']) < 210) {
          illegals.push('EXIFバージョンが基準に合いません');
        }

        if (knackId === 802 || knackId === 801) {
          if (albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '着手前写真' &&
            (albumFrame.photoFrames[0].width < 1024 || albumFrame.photoFrames[0].height < 768)) {
            illegals.push('画像サイズが基準サイズから外れています');
          }

          if (albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '施工状況写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '検査写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '安全管理写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === 'その他写真') {
            if (albumFrame.photoFrames[0].width < 1024 || albumFrame.photoFrames[0].width > 1280 ||
              albumFrame.photoFrames[0].height < 768 || albumFrame.photoFrames[0].height > 1024) {
              illegals.push('画像サイズが基準サイズから外れています');
            }

            if (albumFrame.photoFrames[0].fileSize > 500) {
              illegals.push('ファイルサイズが基準サイズから外れています');
            }
          }

          if (albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '完成写真') {
            if (albumFrame.photoFrames[0].width < 1024 || albumFrame.photoFrames[0].height < 768) {
              illegals.push('画像サイズが基準サイズから外れています');
            }

            if (extraInfo['EXIF:GPSLatitude'] == null || extraInfo['EXIF:Longitude'] == null) {
              illegals.push('GPS情報がありません');
            }
          }

          if (albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '災害写真') {
            if (albumFrame.photoFrames[0].width < 1024 || albumFrame.photoFrames[0].width > 1280 ||
              albumFrame.photoFrames[0].height < 768 || albumFrame.photoFrames[0].height > 1024) {
              illegals.push('画像サイズが基準サイズから外れています');
            }

            if (albumFrame.photoFrames[0].fileSize > 500) {
              illegals.push('ファイルサイズが基準サイズから外れています');
            }

            if (extraInfo['EXIF:GPSLatitude'] == null || extraInfo['EXIF:Longitude'] == null) {
              illegals.push('GPS情報がありません');
            }
          }
        } else if (knackId === 90) {
          if (albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '着手前写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '施工状況写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '検査写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === '安全管理写真' ||
            albumFrame.constructionPhotoInformation['写真情報']['写真区分'] === 'その他写真') {
            if (albumFrame.photoFrames[0].width > 1280 || albumFrame.photoFrames[0].height > 960) {
              illegals.push('画像サイズが基準サイズから外れています');
            }
          }

          if (albumFrame.constructionPhotoInformation['写真情報'] ['写真区分'] === '完成写真' ||
            albumFrame.constructionPhotoInformation['写真情報'] ['写真区分'] === '災害写真') {
            if (extraInfo['EXIF:GPSLatitude'] == null || extraInfo['EXIF:Longitude'] == null) {
              illegals.push('GPS情報がありません');
            }
          }
        }
        if (extraInfo['jacic.believability.image'] === 'NG' || extraInfo['jacic.believability.date'] === 'NG') {
          illegals.push('画像が編集・加工されています。');
        }
        break;
      case 7:
        if ( albumFrame.photoFrames[0].width * albumFrame.photoFrames[0].height < 1200000) {
          illegals.push('有効画素数が基準のサイズから外れています。');
        }
        if (extraInfo['jacic.believability.image'] === 'NG' || extraInfo['jacic.believability.date'] === 'NG') {
          illegals.push('画像が編集・加工されています。');
        }
        break;
      case 8:
      case 9:
        if (extraInfo['jacic.believability.image'] === 'NG' || extraInfo['jacic.believability.date'] === 'NG') {
          illegals.push('画像が編集・加工されています。');
        }
        break;
    }

    if (illegals.length === 0) {
      const crypto = require('crypto');
      let data = await fse.readFile(albumFrame.photoFrames[0].imageFile);
      let hash = crypto.createHash('sha256').update(data, 'binary').digest("hex");
      if (hash !== extraInfo['FILE:HASH']) {
        illegals.push('画像が編集・加工されています。');
      }
    }

    return illegals;
  },

  /**************************************************************************/
  /* Album frame getting operations.                                        */
  /*   These functions are for acceleration of rendering album-template.    */
  /*   Not use them for any other purpose.                                  */
  /**************************************************************************/
  getAlbumFrames: async function(constructionId, albumId, position, count) {
    let result = await bookrackAccessor.getAlbumFrames(constructionId, albumId, position, count);
    for (let frame of result.albumFrames) {
      refineAlbumFrame(frame);
    };
    result.albumFrames = result.albumFrames.map(f => JSON.stringify(f));
    return result;
  },
  getAlbumFrame: async function(constructionId, albumId, frameId) {
    let result = await bookrackAccessor.getAlbumFrame(constructionId, albumId, frameId);
    refineAlbumFrame(result.albumFrame);
    result.albumFrame = JSON.stringify(result.albumFrame);
    return result;
  },
  getAlbumDetail: async function(constructionId, albumId) {
    try {
      let result = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
      return JSON.stringify(result.albumDetail);
    } catch(e) {
      let res = {
        albumId: albumId,
        albumSettings: {}, //this.defaultAlbumSettings,
        albumType: 0,
        spineCover: '',
        frameTotalCount: 0,
        layout: { albumTemplate: '' },
      };
      return JSON.stringify(res);
    }
  },

};

Object.setPrototypeOf(albumOperation, EventEmitter.prototype);
module.exports = albumOperation;




/************************/
/*  Internal functions. */
/************************/
async function clearnBookCoverFiles(covers) {
  if (covers.hasOwnProperty('frontCover')) {
    await fse.remove(covers.frontCover);
  }
  if (covers.hasOwnProperty('backCover')) {
    await fse.remove(covers.backCover);
  }
  if (covers.hasOwnProperty('spineCover')) {
    await fse.remove(covers.spineCover);
  }
}

function findBookrackItem(bookrackItemId, bookrackItems) {
  for (let i = 0; i < bookrackItems.length; i++) {
    if (bookrackItems[i].bookrackItemId === bookrackItemId) return bookrackItems[i];
    if (bookrackItems[i].bookrackItems) {
      const result = findBookrackItem(bookrackItemId, bookrackItems[i].bookrackItems);
      if (result) return result;
    };
  }
  return null;
}

async function getAlbumFrameFromAlbumTemplate(albumParameter) {
  // calculate frame count
  let page = albumParameter.albumSettings.initialPageNumber;
  if ((page % 2) !== 0) {
    page = page + 1;
    albumParameter.albumSettings.initialPageNumber = page;
  }
  try {
    let layoutInfo = await goyoAlbumLayout.getLayoutInfo(albumParameter.layout.albumTemplate);
    let template = await layoutInfo.template;
    let left = template.leftPageBlockCount;
    let right = template.rightPageBlockCount;
    return (left + right) * (page / 2);
  } catch(e) {
    logger.error('getAlbumFrameFromAlbumTemplate', e);
    return  albumParameter.albumSettings.initialPageNumber * 3;
  }
}


function sortByCurrentSetting(metaDataList, fileList) {
  assert(metaDataList.every(d => d.hasOwnProperty('FILE:OriginalName')&&d['FILE:OriginalName'].hasOwnProperty('fieldValue')));
  assert(metaDataList.every(d => d.hasOwnProperty('FILE:FileDate')&&d['FILE:FileDate'].hasOwnProperty('fieldValue')));

  let comparator1;
  switch(programSettings.importImage.sortType) {
    case 1: // ファイル名順（昇順）
      metaDataList.forEach(l => l._sortKey = path.basename(l['FILE:OriginalName'].fieldValue));
      comparator1 = (a, b) => a._sortKey.localeCompare(b._sortKey, 'ja', {numeric:true});
      break;
    case 2: // ファイル名順（降順）
      //comparator1 = (a, b) => b['FILE:OriginalName'].fieldValue.localeCompare(a['FILE:OriginalName'].fieldValue, 'ja', {numeric:true});
      metaDataList.forEach(l => l._sortKey = path.basename(l['FILE:OriginalName'].fieldValue));
      comparator1 = (a, b) => b._sortKey.localeCompare(a._sortKey, 'ja', {numeric:true});
      break;
    case 3: // ファイル日付順（昇順）
      metaDataList.forEach(l => l._sortKey = (new Date(l['FILE:FileDate'].fieldValue)).getTime());
      comparator1 = (a, b) => a._sortKey - b._sortKey;
      break;
    case 4: // ファイル日付順（降順）
      metaDataList.forEach(l => l._sortKey = (new Date(l['FILE:FileDate'].fieldValue)).getTime());
      comparator1 = (a, b) => b._sortKey - a._sortKey;
      break;
    case 0: // ソートしない（fileListの並びでソート）
    default:
      comparator1 = (a, b) => 0;
      break;
  }

  metaDataList.forEach(l => l._sortIndex = fileList.findIndex(f => f===path.resolve(l['FILE:OriginalName'].fieldValue)));
  let comparator = (a, b) => {
    let comp = comparator1(a, b);
    if (comp !== 0)
      return comp;
    else
      return a._sortIndex - b._sortIndex;
  };

  return metaDataList.sort(comparator);
}

function findIndexOfEveryTrailing(array, check) {
  for (let i=array.length-1; i>=0; i--) {
    if (!check(array[i])) {
      return i+1;
    }
  }
  return 0;
}

function makeTextFrameField(key, value, label="") {
  return {
    fieldKey: key,
    fieldValue: value,
    fieldLabel: label,
    hideSentence: 0,
    hideSentenceBackground: 0,
    textFrameId: 0,
  };
}

function removeOtherThanId(treeNode) {
  for (let prop of Object.keys(treeNode)) {
    if (prop === 'bookrackItemId') {
      // do nothing.
    } else if (prop === 'bookrackItems') {
      for (let child of treeNode[prop]) {
        removeOtherThanId(child);
      }
    } else {
      delete treeNode[prop];
    }
  }
}

function refineAlbumFrame(frame) {
  if (frame.photoFrames.length > 0) {
    let pf = frame.photoFrames[0];
    pf['EXIF:DateTimeOriginal'] = pf.extraInfo['EXIF:DateTimeOriginal'];
    pf['FILE:FileSize'] = pf.extraInfo['FILE:FileSize'];
    if ((pf.extraInfo['jacic.believability.image'] === 'NG') || (pf.extraInfo['jacic.believability.date'] === 'NG')) {
      pf['jacic.believability'] = 'NG';
    } else if ((pf.extraInfo['jacic.believability.image'] === 'OK') && (pf.extraInfo['jacic.believability.date'] === 'OK')) {
      pf['jacic.believability'] = 'OK';
    } else {
    }
    delete pf.extraInfo;
  }
  if (frame.textFrames) {
    for (let key in frame.textFrames) {
      let textFrame = frame.textFrames[key];
      delete textFrame.fieldKey;
      delete textFrame.fieldLabel;
      delete textFrame.hideSentence;
      delete textFrame.hideSentenceBackground;
      delete textFrame.textFieldId;
    }
  }
}

const transactionManager = {
  // This object manages transactions in goyo-album-frames.
  // PLEASE BE CAREFUL TO MODIFY IT.
  // Inadvertent modification can cause the critical, less reproducible problem.
  transactionList: [],

  async beginTransaction(constructionId, albumId, immediately=null) {

    let transaction = this.transactionList.find(t => t.constructionId===constructionId && t.albumId===albumId);

    if (transaction) {
      logger.debug('wait other transaction..begin');
      await new Promise((resolve) => {
        transaction.waitList.push(resolve);
      });
      logger.debug('wait other transaction..end');
    } else {
      transaction = {
        constructionId: constructionId,
        albumId: albumId,
        waitList: [],
      };
      this.transactionList.push(transaction);
    }

    let notify = () => {
      let resolve = transaction.waitList.shift();
      if (resolve) {
        resolve();
      } else {
        let index = this.transactionList.indexOf(transaction);
        this.transactionList.splice(index, 1);
      }
    }

    let useGarbage = false;
    try {
      await bookrackAccessor.execTransactionAlbumItems(constructionId, 'begin');
      await bookrackAccessor.execTransactionAlbum(constructionId, albumId, 'begin');
      if (typeof immediately === 'boolean' && immediately === false) {
        let albumInformation = await bookrackAccessor.getAlbumDetail(constructionId, albumId);
        logger.info(JSON.stringify(albumInformation.albumDetail.albumType,null,2));
        useGarbage = albumInformation.albumDetail.albumType != 2;
        await bookrackAccessor.execTransactionGarbageAlbum(constructionId, 'begin', useGarbage);
      }
      logger.trace('begin transaction');
    } catch(e) {
      logger.error('begin transaction', e);
      logger.error('ui stack', new Error());
      logger.info(this.transactionList);
      notify();
      throw new Error('maybe double transaction begin.');
    }

    return {
      transactionList: this.transactionList,
      async commit() {
        try {
          await bookrackAccessor.execTransactionAlbumItems(constructionId, 'commit');
          await bookrackAccessor.execTransactionAlbum(constructionId, albumId, 'commit');
          if (typeof immediately === 'boolean' && immediately === false) {
            await bookrackAccessor.execTransactionGarbageAlbum(constructionId, 'commit', useGarbage);
          }
          logger.trace('commit transaction');
        } catch(e) {
          logger.error('commit transaction', e);
          logger.error('ui stack', new Error());
          logger.info(this.transactionList);
        }
        notify();
      },
      async rollback() {
        try {
          await bookrackAccessor.execTransactionAlbumItems(constructionId, 'rollback');
          await bookrackAccessor.execTransactionAlbum(constructionId, albumId, 'rollback');
          if (typeof immediately === 'boolean' && immediately === false) {
            await bookrackAccessor.execTransactionGarbageAlbum(constructionId, 'rollback', useGarbage);
          }
          logger.trace('rollback transaction');
        } catch(e) {
          logger.error('rollback transaction', e);
          logger.error('ui stack', new Error());
          logger.info(this.transactionList);
        }
        notify();
      },
    };
  }
};

async function beginTransaction(constructionId, albumId, immediately=null) {
  return transactionManager.beginTransaction(constructionId, albumId, immediately);
}

async function getAlbumFramesById(constructionId, albumId, frameIds) {
  if (frameIds.length > THE_THRESHOLD_OF_USING_GET_ALBUM_FRAMES) {
    let { albumFrames } = await bookrackAccessor.getAlbumFrames(constructionId, albumId);
    return albumFrames.filter(f => frameIds.some(id => id === f.albumFrameId));
  } else {
    return await Promise.all(frameIds.map(id => {
      return bookrackAccessor.getAlbumFrame(constructionId, albumId, id).then(r => r.albumFrame);
    }));
  }
}

function getAllAlbumsFromBookrackItems(bookrackItems) {
  if (!bookrackItems) return [];
  let albums = [];
  bookrackItems.forEach(bookrackItem => {
    if (bookrackItem.bookrackItemType === 3) {
      albums.push(bookrackItem);
    }
    albums = albums.concat(getAllAlbumsFromBookrackItems(bookrackItem.bookrackItems));
  });
  return albums;
}

