'use strict';
const common = require('./connect-if-util');

module.exports = {
  'get-constructions': async function(target, args) {
    const getConstructions = require('./get-constructions');
    let result = await getConstructions.getConstructions();
    return result;
  },

  'get-photo-information-tree': async function(target, args) {
    const getPhotoInformationTree = require('./get-photo-information-tree');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }

    let result = await getPhotoInformationTree.getPhotoInformationTree(constructionId);
    return result;
  },

  'get-bookrack-tree': async function(target, args) {
    const getBookrackTree = require('./get-bookrack-tree');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let result = await getBookrackTree.getBookrackTree(constructionId);
    return result;
  },

  'register-album-photos': async function(target, args) {
    const registerAlbumPhotos = require('./register-album-photos');
    let [constructionId, albumId] = common.splitIds(target);
    if (!constructionId || !albumId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    const result = await registerAlbumPhotos.registerAlbumPhotos(constructionId, albumId, jsonFile);
    return result;
  },

  'register-album-photos-set': async function(target, args) {
    const registerAlbumPhotosSet = require('./register-album-photos-set');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    let result = await registerAlbumPhotosSet.registerAlbumPhotosSet(constructionId, jsonFile);
    return result;
  },

  'get-album-templates': async function(target, args) {
    const getAlbumTemplates = require('./get-album-templates');
    const result = await getAlbumTemplates.getAlbumTemplates();
    return result;
  },

  'get-album-photos': async function(target, args) {
    const getAlbumPhotos = require('./get-album-photos');
    let ids = common.splitIds(target);
    if (!ids || ids.length != 2) {
      throw new Error(`Invalid id '${target}'.`);
    }
    let result = await getAlbumPhotos.getAlbumPhotos(ids[0], ids[1]);
    return result;
  },

  'get-construction-information': async function (target){
    const constructionInformation = require('./get-construction-information');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }

    let result = await constructionInformation.getConstructionInformation(constructionId);
    return result;
  },

  'get-construction-type-master' : async function(target) {
    const getConstructionsMaster = require('./get-construction-type-master');
    let knackId = parseInt(target);
    if (!knackId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let result = await getConstructionsMaster.getConstructionsMaster(knackId);
    return result;
  },

  'get-deleted-photos': async function(target) {
    const deletedPhoto = require('./get-deleted-photos');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let result = await deletedPhoto.getDeletedPhoto(constructionId);
    return result;
  },

  'register-photos-by-kokuban-rule': async function(target, args) {
    const registerPhotosKR = require('./register-photos-by-kokuban-rule');
    let result = await registerPhotosKR.registerPhotosByKokubanRule(target, args[0]);
    return result;
  },

  'register-photos-by-box-album': async function(target, args) {
    const registerPhotosBA = require('./register-photos-by-box-album');
    let result = await registerPhotosBA.registerPhotosByBoxAlbum(target, args[0]);
    return result;
  },

  'register-bookrack-item': async function(target, args) {
    const registerBookrackItem = require('./register-bookrack-item');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    let result = await registerBookrackItem.registerBookrackItem(constructionId, jsonFile);
    return result;
  },

  'register-bookrack-items': async function(target, args) {
    const registerBookrackItems = require('./register-bookrack-items');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    let result = await registerBookrackItems.registerBookrackItems(constructionId, jsonFile);
    return result;
  },

  'get-photo-classifications':async function(target,arg){
    const getPhotoClassifications =require('./get-photo-classifications');
    let knackId = parseInt(target);
    if (!knackId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let result = await getPhotoClassifications.getPhotoClassifications(knackId);
    return result;
  },
  'get-building-master':async function(target,args){
    const getBuildingMaster =require('./get-building-master');
    let knackId = parseInt(target);
    if (!knackId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let result = await getBuildingMaster.getBuildingMaster(knackId);
    return result;
  },

  'register-photo-information-tree': async function(target, args) {
    const registerPhotoInforTree = require('./register-photo-information-tree');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    let result = await registerPhotoInforTree.registerPhotoInforTree(constructionId, jsonFile);
    return result;
  },

  'get-license': async function(target, args) {
    const getLicense = require('./get-license');
    let result = await getLicense.getLicense();
    return result;
  },
  
  'register-construction': async function(target, args) {
    const registerConstruction = require('./register-construction');
    let jsonFile = target;
    let result = await registerConstruction.registerContruction(jsonFile);
    return result;
  },

  'get-register-state': async function(target, args) {
    const getRegisterState = require('./get-register-state');
    let constructionId = parseInt(target);
    if (!constructionId) {
      throw new Error(`Invalid target '${target}'.`);
    }
    let jsonFile = args[0];
    const result = await getRegisterState.getRegisterState(constructionId, jsonFile);
    return result;
  },

  'delete-empty-bookrack': async function(target, args) {
    const deleteEmptyBookrack = require('./delete-empty-bookrack');
    let ids = common.splitIds(target);
    if (!ids || ids.length != 2) {
      throw new Error(`Invalid id '${target}'.`);
    }
    const result = await deleteEmptyBookrack.deleteEmptyBookrack(ids[0], ids[1]);
    return result;
  },
};

