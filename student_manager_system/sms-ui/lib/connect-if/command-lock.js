'use strict';

const lockFactory = require('../lock-manager/goyo-lock-manager');

var lockManager = null;

const LOCK_BUSY = 'construction lock busy';

async function lockSharedConstruction(constructionId) {
  // acquire shared lock
  lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
  await lockManager.lockConstruction(true);
}

async function unLockSharedConstruction() {
  if (lockManager != null) {
    try {
      // release shared lock
      await lockManager.lockConstruction(false);
    } catch(e) {
      // do nothing...
    }
  }
}

async function existSharedLockOwners() {
  if (await lockManager.existSharedLockOwners()) {
    throw new Error(LOCK_BUSY);
  }
}

async function lockAlbum(albumId) {
  // acquire album lock
  if (!await lockManager.lockAlbum(albumId, true)) {
    throw new Error(LOCK_BUSY);
  }
}

async function unlockAlbum(albumId) {
  if (lockManager != null) {
    try {
      // release album lock
      await lockManager.lockAlbum(albumId, false);
    } catch(e) {
      // do nothing...
    }
  }
}

async function lockExclusiveConstruction() {
  try {
    // acquire exclusive lock
    await lockManager.lockAlbumItemDatabase(true);
  } catch(e) {
    throw new Error(LOCK_BUSY);
  }
}

async function unLockExclusiveConstruction() {
  if (lockManager != null) {
    try {
      // release exclusive lock
      await lockManager.lockAlbumItemDatabase(false);
    } catch(e) {
      // do nothing...
    }
  }
}

module.exports = {
  lockSharedConstruction,
  unLockSharedConstruction,
  existSharedLockOwners,
  lockAlbum,
  unlockAlbum,
  lockExclusiveConstruction,
  unLockExclusiveConstruction,
}
