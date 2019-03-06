'use strict';

// Node.js modules.
const assert = require('assert');

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('goyo-lock-manager');

const WAIT_INTERVAL = 300;
const WAIT_MAX = 10000;

var lockManagers = new Map();

class LockManager {
  constructor(construction) {
    this.construction = construction;
  }

  async existSharedLockOwners() {
    logger.debug('call existSharedLockOwners');
    return false;
  }

  async lockConstruction(isLock) {
    logger.debug('call lockConstruction');
  }

  async lockAlbumOperation(albumId, isLock, 
    obtainLock=async(constructionId, albumId, isLock)=>{}, 
    failedLock=async(constructionId, albumId, isLock, e)=>{}) {
      assertArguments(obtainLock, failedLock);
      await obtainLock(this.construction.constructionId, albumId, isLock);
  }

  async lockAlbum(albumId, isLock) {
    logger.debug('call lockAlbum');
    return true;
  }

  async lockAlbumItemDatabase(isLock) {
    logger.debug('call lockAlbumItemDatabase');
  }

  async unlockAlbums() {
    logger.debug('call unlockAlbums');
  }

  async finalize() {
    logger.debug('call finalize');
    let constructionId = this.construction.constructionId;
    lockManagers.delete(constructionId);
  }

  async closeAll() {
    try {
      logger.debug(`closeAll bookrackAccessor.syncConstruction`);
      await bookrackAccessor.syncConstruction();
    } catch(e) {
      logger.error('Failed to bookrackAccessor.syncConstruction', e);
    }
  }
  
  waitUnLockAll() {
    let instance = this;
    return new Promise((resolve, reject) => {
      logger.debug(`unLockAll constructionId=${instance.construction.constructionId}`);
      instance.closeAll().then(()=>{
        resolve();
      });
    });
  }

}

class SharedLockManager extends LockManager {
  constructor(construction) {
    super(construction);
    this.lockAlbums = new Set();
    this.isLockAlbumItems = false;
    this.lockCount = new Map();
    this.albumItemsLockCount = 0;
    this.finalized = false;
  }

  async existSharedLockOwners() {
    logger.debug('call existSharedLockOwners');
    try {
      let { sharedLockOwners } = await bookrackAccessor.getSharedLockOwners(this.construction.constructionId);
      logger.debug('sharedLockOwners');
      logger.debug(JSON.stringify(sharedLockOwners, null, 2));
      let hostName = bookrackAccessor.hostName;
      for (let host of sharedLockOwners) {
        if (hostName !== host) {
          logger.debug(`${hostName}!==${host}`);
          return true;
        }
      }
    } catch(e) {
      logger.error('Failed to bookrackAccessor.getSharedLockOwners', e);
    }
    return false;
  }

  async lockConstruction(isLock) {
    logger.debug(`call lockConstruction(${isLock})`);
    // need a try-catch at the caller
    let constructionId = this.construction.constructionId;
    await bookrackAccessor.lockSharedConstruction(constructionId, isLock);
  }

  async lockAlbumOperation(albumId, isLock, 
    obtainLock=async(constructionId, albumId, isLock)=>{}, 
    failedLock=async(constructionId, albumId, isLock, e)=>{}, isAutoUnLock = true) {
      logger.debug(`call lockAlbumOperation(${albumId},${isLock})`);
      assertArguments(obtainLock, failedLock);

      let constructionId = this.construction.constructionId;
      let locked = false;
      try {
        await this._lockAlbum(albumId, isLock);
        locked = isLock;
        await obtainLock(constructionId, albumId, isLock);
      } catch(e) {
        logger.error('Failed to lockAlbumOperation', e);
        await failedLock(constructionId, albumId, isLock, e);
      } finally {
        if (isAutoUnLock) {
          if (isLock && locked) {
            this.lockAlbum(albumId, false);
          }  
        }
      }
  }

  async lockAlbum(albumId, isLock) {
    logger.debug(`call lockAlbum(${albumId},${isLock})`);
    try {
      await this._lockAlbum(albumId, isLock);
      return true;
    } catch (e) {
      if (e.message !== 'another host name already exists')
        logger.error('Failed to lockAlbum', e);
    }
    return false;
  }

  async _lockAlbum(albumId, isLock) {
    let constructionId = this.construction.constructionId;

    let count = 0;
    if (this.lockCount.has(albumId)) {
      count = this.lockCount.get(albumId);
    }
    let afterLockCount = isLock ? count + 1 : (count > 0) ? count - 1 : 0;

    if (isLock || afterLockCount === 0) {
      await bookrackAccessor.lockAlbum(constructionId, albumId, isLock);
    }

    if (isLock) {
      this.lockAlbums.add(albumId);
      this.lockCount.set(albumId, afterLockCount);
    } else {
      this.lockCount.set(albumId, afterLockCount);
      await bookrackAccessor.syncConstruction(constructionId, albumId);
      logger.debug(`exit syncConstruction(${constructionId}, ${albumId})`);
      if (afterLockCount === 0) {
        this.lockAlbums.delete(albumId);
      }

    } 
  }

  async lockAlbumItemDatabase(isLock) {
    logger.debug(`call lockAlbumItemDatabase(${isLock})`);
    // need a try-catch at the caller
    let constructionId = this.construction.constructionId;

    let count = this.albumItemsLockCount;
    let afterLockCount = isLock ? count + 1 : (count > 0) ? count - 1 : 0;
    if (isLock || afterLockCount === 0) {
      await bookrackAccessor.lockAlbumItems(constructionId, isLock);
    }

    this.isLockAlbumItems = afterLockCount > 0;

    if (afterLockCount === 0) {
      await bookrackAccessor.syncConstruction(constructionId);
      logger.debug(`exit syncConstruction(${constructionId})`);
    }
  }

  async unlockAlbums() {
    logger.debug('call unlockAlbums');
    let constructionId = this.construction.constructionId;
    // unlock album item db
    if (this.isLockAlbumItems) {
      try {
        await bookrackAccessor.lockAlbumItems(constructionId, false);
      } catch(e) {
        logger.error('Failed to bookrackAccessor.lockAlbumItems', e);
      }
    }
    this.isLockAlbumItems = false;
    // unlock album from the window side
    // .....
  }

  async finalize() {
    logger.debug('call finalize');
    await this.unlockAlbums();
    // unlock construction
    let constructionId = this.construction.constructionId;
    try {
      await bookrackAccessor.lockSharedConstruction(constructionId, false);
    } catch(e) {
      logger.error('Failed to bookrackAccessor.lockSharedConstruction', e);
    } finally {
      lockManagers.delete(constructionId);
      this.finalized = true;
    }
  }

  waitUnLockAll() {
    let instance = this;
    let constructionId = instance.construction.constructionId;
    let time = 0;
    return new Promise((resolve, reject) => {
      let id = setInterval(function () {
        time += WAIT_INTERVAL;
        logger.debug(`wait... (constructionId=${constructionId} ${instance.lockAlbums.size})`);
        if ((instance.lockAlbums.size === 0 && instance.finalized)
          || time >= WAIT_MAX) {
          clearInterval(id);
          logger.debug(`unLockAll constructionId=${constructionId}`);
          instance.closeAll()
            .then(()=>{ resolve(); });
        }
      }, WAIT_INTERVAL);
    
    });
  }

}

// factory function

var failedConstruction = {
  constructionId : -1,
  isSharedFolder : false,
};

async function makeLockManager(construction=failedConstruction) {
  assert(construction.hasOwnProperty('constructionId'));
  assert(construction.hasOwnProperty('isSharedFolder'));
  assert(construction.constructionId !== 0);

  let constructionId = construction.constructionId;

  if (lockManagers.has(constructionId)) {
    return lockManagers.get(constructionId);
  }
  let lockManager;
  if (construction.isSharedFolder == true) {
    lockManager = new SharedLockManager(construction);
  } else {
    lockManager = new LockManager(construction);
  }
  lockManagers.set(constructionId, lockManager);
  return lockManager;
};

async function makeLockManagerByConstructionId(constructionId) {
  let { construction } = await bookrackAccessor.getConstructionDetail(constructionId, false);
  return makeLockManager(construction);
};

async function waitConstructionUnLockAll() {
  logger.debug(`waitConstructionUnLockAll()`);
  let promiseArray = [];
  lockManagers.forEach((v) => {
    promiseArray.push(v.waitUnLockAll());
  });
  await Promise.all(promiseArray);
  logger.debug(`exit waitConstructionUnLockAll()`);
}

var accessor = {
  makeLockManager,
  makeLockManagerByConstructionId,
  waitConstructionUnLockAll
}

module.exports = accessor;

// private function
function assertArguments(resolve, reject) {
  assert(typeof resolve === 'function');
  assert(typeof reject === 'function');
}
