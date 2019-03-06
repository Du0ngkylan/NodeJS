'use strict';

// Node modules.
// ...none

// Goyo modules.
const bookrackAccessor = require('goyo-bookrack-accessor');
const logger = require('../goyo-log')('delete-empty-bookrack');
const commandLock = require('./command-lock');

const IO_ERROR = 2;
const INPUT_ERROR = 5;

const accessor = {
  async deleteEmptyBookrack(constructionIdStr, bookrackItemIdStr) {
    try {
      let constructionId = parseInt(constructionIdStr);
      let bookrackItemId = parseInt(bookrackItemIdStr);

      await commandLock.lockSharedConstruction(constructionId);
      await commandLock.lockExclusiveConstruction();

      let inputError = {
        "constructionId" : constructionId,
        "error" : INPUT_ERROR
      };

      let { bookrackItems } = await bookrackAccessor.getBookrackItems(constructionId);

      let bookrackCount = 0;
      let targetBookrackItem = null;
      for (let bookrackItem of bookrackItems) {
        if (bookrackItem.bookrackItemType === 0
             && bookrackItem.specialType === 0) {
          bookrackCount++;
          
          // target bookrack?
          if (bookrackItem.bookrackItemId === bookrackItemId) {
            targetBookrackItem = bookrackItem;
          }
        }
      }

      // not found target or last bookrack
      if (targetBookrackItem == null || bookrackCount === 1) {
        return inputError;
      }

      // empty items ?
      if (targetBookrackItem.bookrackItems.length > 0) {
        return inputError;
      }
      
      try {
        // delete empty bookrack
        await bookrackAccessor.deleteBookrackItem(constructionId, 
          targetBookrackItem.bookrackItemId);

        // sort
        const registBookrackItemCommand = require('./register-bookrack-item');
        await registBookrackItemCommand.sortBookrackItems(constructionId);

      } catch (e) {
        return {
          "constructionId" : constructionId,
          "error" : IO_ERROR
        };  
      }

      // success
      return {
        "constructionId" : constructionId,
        "error" : 0
      };

    } catch (ex) {
      logger.error('Failed to deleteEmptyBookrack', ex);
      throw ex;
    } finally {
      await commandLock.unLockExclusiveConstruction();
      await commandLock.unLockSharedConstruction();
    }
  }
};

module.exports = accessor;
