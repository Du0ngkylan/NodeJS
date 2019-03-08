const assert = require('assert');
const windowHandler = require('./window-handler');
const BookrackViewWindowSet = require('./bookrackview-windowset');
const TreeViewWindowSet = require('./tree-view-controller');

module.exports = {

  // Constants.
  MODE_CONSTRUCTION_SELECTION: 'CONSTRUCTION_SELECTION',
  MODE_BOOKRACK_VIEW: 'BOOKRACK_VIEW',
  MODE_TREE_VIEW: 'TREE_VIEW',


  // Instance properties(private).

  constructionWindow: null,
  bookrackViewWindowSet: null,
  treeViewWindowSet: null,


  // Instance methods(public).

  setNextMode: function(mode, param) {
    this.next = { mode, param };
  },

  startApplication: async function() {
    while (this.next) {
      let current = this.next;
      this.next = null;

      await this.windowMakingFunctions[current.mode](current.param);
    }
  },

  windowMakingFunctions: {
    'TREE_VIEW': async(constructionId) => {
      console.log('view-mode: switch to TreeView');
      this.treeViewWindowSet = await TreeViewWindowSet.open(constructionId);

      return new Promise((resolve, reject) => {
        this.treeViewWindowSet.on('closed', () => {
          resolve();
        });
      });
    },
    'CONSTRUCTION_SELECTION': async (param) => {
      console.log('view-mode: switch to ConstructionSlection');
      let promise = windowHandler.openConstructionWindow(null, param.selectionMode, param.defaultConstructionId);

      this.constructionWindow = await promise;
      this.constructionWindow.show();

      return new Promise((resolve, reject) => {
        this.constructionWindow.on('closed', () => {
          resolve();
        });
      });
    },
    'BOOKRACK_VIEW': async (constructionId) => {
      console.log('view-mode: switch to BookrackView');
      this.bookrackViewWindowSet = await BookrackViewWindowSet.open(constructionId);
      return new Promise((resolve, reject) => {
        this.bookrackViewWindowSet.on('closed', () => {
          resolve();
        });
      });
    },
  },
};
