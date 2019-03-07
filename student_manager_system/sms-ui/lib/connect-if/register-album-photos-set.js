'use strict';
// 複数AlbumへのregisterAlbumPhotoを実行する。
// Node modules.
const fse = require('fs-extra');
const path = require('path');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const albumOperation = require('../goyo-album-operation');
const logger = require('../goyo-log')('register-album-photos-set');
const commandLock = require('./command-lock');
const common = require('./connect-if-util');

// private function

function outputProgress(progress) {
  console.log(JSON.stringify(progress))
}

function getFirstPhotoFrame(photoFrames) {
  if (Array.isArray(photoFrames) && 0 < photoFrames.length) {
    return photoFrames[0];
  }
  return null;
}

const accessor = {
  async registerAlbumPhotosSet(constructionId, jsonfile) {
    try {
      constructionId = Number(constructionId);
      await commandLock.lockSharedConstruction(constructionId);
      await commandLock.lockExclusiveConstruction();
      
      const inputJsonDatas = JSON.parse(await fse.readFile(jsonfile));
      
      // jsonから実行する写真登録のデータを取得整形する。albumId, registerAlbumPhotoのjsonと同形式のjson。
      let registerAlbumPhotosDatas = [];
      let progressTotal = 0;
      for( var inputJsonData of inputJsonDatas ) {
        registerAlbumPhotosDatas.push({
          "albumId":inputJsonData.target,
          "jsonData":JSON.parse(await fse.readFile(inputJsonData.jsonfile))
        });
        progressTotal += registerAlbumPhotosDatas[registerAlbumPhotosDatas.length-1].jsonData.length + 1;
      }
      var progress = {
        "done": 0,
        "total": progressTotal
      };
      var response = {
        "success": [],
        "failure": []
      };

      // load program settings
      await require('../goyo-program-settings').initialize();
      
      // Albumごとに写真を登録していく  
      for( let index in registerAlbumPhotosDatas ){
        outputProgress(progress);
        let [targetConstructionId, albumId] = common.splitIds(registerAlbumPhotosDatas[index].albumId);
        targetConstructionId = Number(targetConstructionId);
        albumId = Number(albumId);
        let filePaths = registerAlbumPhotosDatas[index].jsonData;
        
        // targetの工事IDとjsonが指定しているAlbumの工事IDがずれていたらエラー返却
        if( targetConstructionId != constructionId ){
          response.failure.push({
            "index": index,
            "albumId": registerAlbumPhotosDatas[index].albumId,
            error: 2,
            errorMessage: "differed constructionId"
          });
          return response;
        }
        let { albumDetail } = await bookrackAccessor.getAlbumDetail(constructionId, albumId);

        // Albumに写真を登録していく
        try{
          await commandLock.lockAlbum(albumId);
          
          // make album frames (get meta data)
          let sourceFileMap = new Map();
          let files = [];
          filePaths.forEach((f) => {
            let fullPath = path.resolve(f.file);
            files.push(fullPath);
            sourceFileMap.set(fullPath.replace(/\\/g, '\/'), f.file);
          });
          let albumFrames = await albumOperation.makeAlbumFrames(files, 'KuraemonKokuban', albumDetail);

          // key : filepath , value : album frame
          let albumFrameMap = new Map();
          albumFrames.forEach((albumFrame)=>{
            let imageFile = albumFrame.photoFrames[0].imageFile;
            let p = imageFile.replace(/\//g, '\\');
            albumFrameMap.set(p, albumFrame);
          });

          progress.done++;
          outputProgress(progress);
          let newFrames = [];
          let resultFrames = { successFrames : [], errorFrames : []};
          for (let i = 0; i < files.length; i++) {
            let albumFrame = albumFrameMap.get(files[i]);
            if (albumFrame === undefined) {
              response.failure.push({
                index: index,
                albumId: albumId,
                file: filePaths[i].file.toString(),
                error: 5,
                errorMessage: "invalid file"
              });
              progress.done++;
              outputProgress(progress);
              continue;
            }
            try {
              // set consturction photo information (Overwrite acquired information)
              if (filePaths[i].hasOwnProperty('title')
              && filePaths[i].title) {
                albumFrame.constructionPhotoInformation.写真情報.写真タイトル = filePaths[i].title;
              }
              if (filePaths[i].hasOwnProperty('isRepresentative')
              && filePaths[i].isRepresentative) {
                albumFrame.constructionPhotoInformation.写真情報.代表写真 = "1";
              } else {
                albumFrame.constructionPhotoInformation.写真情報.代表写真 = "0";
              }
              if (filePaths[i].hasOwnProperty('isFrequenceOfSubmission')
              && filePaths[i].isFrequenceOfSubmission) {
                albumFrame.constructionPhotoInformation.写真情報.提出頻度写真 = "1";
              } else {
                albumFrame.constructionPhotoInformation.写真情報.提出頻度写真 = "0";
              }
              // set textFrames from sentence(Overwrite acquired information)
              for (let key in filePaths[i].sentence) {
                albumFrame.textFrames[key] =  {
                  "fieldKey": key,
                  "fieldLabel": '',
                  "fieldValue": filePaths[i].sentence[key],
                  "hideSentence": 0,
                  "hideSentenceBackground": 0,
                };  
              }
              if (filePaths[i].hasOwnProperty("connectHash")) {
                let photoFrame = getFirstPhotoFrame(albumFrame.photoFrames);
                if (photoFrame.hasOwnProperty('extraInfo')) {
                  photoFrame.extraInfo.connectHash = filePaths[i].connectHash;
                }
              }
            } catch (error) {
              response.failure.push({
                index: index,
                albumId: albumId,
                file: filePaths[i].file.toString(),
                error: 5,
                errorMessage: error.message
              });
              logger.error(new Error('Invalid filePath'), error);
              progress.done++;
              outputProgress(progress);
              continue;
            };
            newFrames.push(albumFrame);
          }

          await albumOperation.replaceAndInsertFrames(constructionId, albumId, 
            newFrames, null, 
            ()=>{ cancel : false }, 
            (done, total)=>{
              progress.done++;
              outputProgress(progress); 
            }, false, resultFrames);

          // set success frames
          resultFrames.successFrames.forEach((successObj) => {
            response.success.push({
              index: index,
              albumId: albumId,
              file : sourceFileMap.get(successObj.albumFrame.photoFrames[0].imageFile),
            });
          });
          
          // set error frames
          resultFrames.errorFrames.forEach((errorObj) => {
            response.failure.push({
              file : sourceFileMap.get(errorObj.albumFrame.photoFrames[0].imageFile),
              error: 2,
              errorMessage: errorObj.errorMessage
            });
          });

        } catch (ex) {
          logger.error(ex.message);
          
          for (let f of filePaths) {
            response.failure.push({
              index: index,
              albumId: albumId,
              file: f.file.toString(),
              error: 2,
              errorMessage: ex.message
            });
          }
          return response;
        } finally {
          await commandLock.unlockAlbum(albumId);
        }
      }
      
      return response;
    } catch (ex) {
      logger.error('Failed to registerAlbumPhotosSet', ex);
      throw ex;
    } finally {
      await commandLock.unLockExclusiveConstruction();
      await commandLock.unLockSharedConstruction();
    }
  }
};

module.exports = accessor;
