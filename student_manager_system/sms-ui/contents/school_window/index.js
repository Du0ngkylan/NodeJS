
(function() {
'use strict';

const {remote} = require('electron');
const {viewMode} = remote.require('./lib/goyo-window-controller');
const bookrackAccessor = remote.require('goyo-bookrack-accessor');
const goyoConstructionOperation =
    remote.require('./lib/goyo-construction-operation');
const goyoDialog = remote.require('./lib/goyo-dialog-utils');
const fs = remote.require('fs');
const path = remote.require('path');

const MODE_ONLYSELECTION = '#mode.onlyselection';
const MODE_NORMAL = '#mode.normal';
var mode = MODE_NORMAL;

const DEFAULT_GRID_DATA = [
  {
    comp_no: '',
    comp_year: '',
    const_no: '',
    const_name: '  読み込み中..  ',
    customer_name: '',
    const_startdate: '',
    const_enddate: '',
    manner: '',
    data_folder: ''
  },
];

var currentData = [];
let oldIndex;
let startIndex;

let selection = {
  _id: null,
  _index: null,
  get index() {
    let indexStr = $('#list').jqGrid('getGridParam', 'selrow');
    let index;
    if (indexStr != null && indexStr !== '') {
      this._index = parseInt(indexStr);
      this._id = parseInt(
          $($($('#list').jqGrid('getCell', this._index, 'comp_no')).get(1))
              .data('id'));
    }
    index = this._index;
    return index;
  },
  set index(value) {
    this._id =
        parseInt($($($('#list').jqGrid('getCell', value + 1, 'comp_no')).get(1))
                     .data('id'));
    $('#list').jqGrid('setSelection', value);
    this._index = value;
  },
  get id() {
    return this._id;
  },
  set id(value) {
    if (value != null) {
      this._id = value;
      this._index = parseInt($('#list')
                                 .find('[data-id="' + value + '"]')
                                 .parents('tr')
                                 .attr('id'));
      $('#list').jqGrid('setSelection', this._index);
    }
  }
};

function getSelectedConstruction() {
  let row = $('#list').jqGrid('getGridParam', 'selrow');
  if (row) {
    return currentData.constructions[Number(row) - 1];
  } else {
    return null;
  }
}

function buttonSetting() {
  // set style and action to buttons.
  if (mode === MODE_NORMAL) {
    document.querySelector('#addbookrack').onclick = async function() {
      let win = remote.getCurrentWindow();
      let result = await goyoDialog.showNewConstructionSelectionDialog(win);
      // let result = 'NEW';

      if (result === 'NEW') {
        win.hide();
        await goyoConstructionOperation.create(win);
        await reloadGrid();
        win.show();
      } else if (result === 'COPY') {
        let construction = getSelectedConstruction();
        if (construction) {
            await goyoConstructionOperation.copy(win, construction);
            await reloadGrid();
        }
      }
    };

    document.querySelector('#showbookrack').onclick = async function() {
      // get selected construction or show warning message.
      let construction = getSelectedConstruction();
      if (!construction) {
        await goyoDialog.showSimpleMessageDialog(
            remote.getCurrentWindow(), '工事一覧', '工事を選択してください',
            'OK');
        return;
      }

      viewMode.setNextMode(
          viewMode.MODE_BOOKRACK_VIEW, construction.constructionId);
      window.close();
    };

    document.querySelector('#editbookrack').onclick = async function() {
      // get selected construction or show warning message.
      let construction = getSelectedConstruction();
      if (!construction) {
        await goyoDialog.showSimpleMessageDialog(
            remote.getCurrentWindow(), '工事一覧', '工事を選択してください',
            'OK');
        return;
      }

      try {
        let win = remote.getCurrentWindow();
        win.hide();
        await goyoConstructionOperation.edit(win, construction.constructionId);
        await reloadGrid();
        win.show();
      } catch (e) {
        console.log('error: ', e);
      }
    };

    // document.querySelector('#deletebookrack').onclick = async function() {
    //   let construction = getSelectedConstruction();
    //   if (construction != undefined) {
    //     const albums =
    //         await bookrackAccessor.getAlbums(construction.constructionId);
    //     let win = remote.getCurrentWindow();
    //     let result = await goyoDialog.showDeleteConfirmDialog(win, {
    //       title: 'データの削除',
    //       message: `選択した本棚を削除します。<br>${
    //           construction.constructionName}（${albums.albums.length}冊, ${
    //           convertSize(getConstructionDataSize(construction.dataFolder))})`,
    //       question: '削除を実行しますか？',
    //       icon:
    //           'goyop:///contents/construction_window/images/confirm_delete.png',
    //       hasCancel: true,
    //       okTitle: '削除'
    //     });
    //     if (result === true) {
    //       result = await goyoDialog.showDeleteConfirmDialog(win, {
    //         title: 'データの削除',
    //         message: '本当に本棚のデータを全て削除してよろしいですか？',
    //         verticalMiddleMessage: true,
    //         icon: 'goyop:///contents/construction_window/images/alert.png',
    //         hasCancel: true,
    //         okTitle: 'はい(Y)',
    //         cancelTitle: 'いいえ(N)',
    //         okShortcutKey: 'Y',
    //         cancelShortcutKey: 'N',
    //         buttonSize: [86, 33],
    //         width: 398,
    //         height: 190
    //       });
    //       if (result === true) {
    //         await bookrackAccessor.deleteConstruction(
    //             construction.constructionId);
    //         selection.index =
    //             selection.index > 1 ? selection.index - 1 : selection.index;
    //         reloadGrid(selection.index);
    //       }
    //     }
    //   }
    // };

    // document.querySelector('#movebookrackup').onclick = async function() {
    //   let construction = getSelectedConstruction();
    //   if (construction != undefined) {
    //     await bookrackAccessor.updateConstructionOrder([{
    //       constructionId: construction.constructionId,
    //       displayNumber: selection.index - 1
    //     }]);
    //     setStateButton();
    //     document.loadType = 'moveup';
    //     document.querySelector('#movebookrackdown').disabled = false;
    //     selection.index--;
    //     reloadGrid(selection.index);
    //   }
    // };

    // document.querySelector('#movebookrackdown').onclick = async function() {
    //   let construction = getSelectedConstruction();
    //   if (construction != undefined) {
    //     await bookrackAccessor.updateConstructionOrder([{
    //       constructionId: construction.constructionId,
    //       displayNumber: selection.index + 1
    //     }]);
    //     setStateButton();
    //     document.loadType = 'movedown';
    //     document.querySelector('#movebookrackup').disabled = false;
    //     selection.index++;
    //     reloadGrid(selection.index);
    //   }
    // };

    document.querySelector('#quit').onclick = function() {
      window.close();
    };

  } else if (mode === MODE_ONLYSELECTION) {
    // All buttons except showbookrack is disabled in ONLYSELECTION mode.
    document.querySelector('#addbookrack').disabled = true;
    document.querySelector('#sharebookrack').disabled = true;
    document.querySelector('#deletebookrack').disabled = true;
    document.querySelector('#editbookrack').disabled = true;
    enableMoveConstructionButton(false);

    // showbookrack button kicks window transition to TreeView.
    document.querySelector('#showbookrack').onclick = async function() {
      let construction = getSelectedConstruction();
      if (!construction) {
        await goyoDialog.showSimpleMessageDialog(
            remote.getCurrentWindow(), '工事一覧', '工事を選択してください',
            'OK');
      } else {
        viewMode.setNextMode(
            viewMode.MODE_TREE_VIEW, construction.constructionId);
        window.close();
      }
    };

  } else {
  }
}

function getConstructionDataSize(dataDir) {
  let stats = fs.lstatSync(dataDir);
  let total = stats.size;
  if (stats.isDirectory()) {
    let list = fs.readdirSync(dataDir);
    if (list.length > 0) {
      list.forEach(diritem => {
        let sz = getConstructionDataSize(path.join(dataDir, diritem));
        total += sz;
      });
    }
  }
  return total;
}

function convertSize(size) {
  let type = 0;
  while (size > 1024) {
    size /= 1024;
    type++;
    if (type == 4) {
      break;
    }
  }
  size = round(size, 2);
  switch (type) {
    case 0:
      return size + 'bytes';
    case 1:
      return size + 'KB';
    case 2:
      return size + 'MB';
    case 3:
      return size + 'GB';
    case 4:
      return size + 'GB';
  }
}

function round(num, decimal) {
  return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
}

function enableMoveConstructionButton(enable) {
  if (enable) {
    document.querySelector('#movebookrackup').disabled = false;
    document.querySelector('#movebookrackdown').disabled = false;
  } else {
    document.querySelector('#movebookrackup').disabled = true;
    document.querySelector('#movebookrackdown').disabled = true;
  }
}

function initGrid() {
  $('#list').jqGrid({
    data: DEFAULT_GRID_DATA,
    width: 780,
    height: 360,
    datatype: 'local',
    shrinkToFit: 1,
    colNames: [
      'No.', '年度', '工事番号', '工事名称', '発注者', '工期開始日',
      '工期終了日', '準拠する要領', 'データフォルダ'
    ],
    colModel: [
      {
        index: 'comp_no',
        name: 'comp_no',
        width: '60px',
        sortable: true,
        sorttype: function(cell) {
          return parseInt($($(cell).get(1)).data('id'));
        },
        align: 'right'
      },
      {index: 'comp_year', name: 'comp_year', width: '35px', sortable: true},
      {index: 'const_no', name: 'const_no', width: '100px', sortable: true},
      {index: 'const_name', name: 'const_name', width: '300px', sortable: true},
      {
        index: 'customer_name',
        name: 'customer_name',
        width: '45px',
        sortable: true
      },
      {
        index: 'const_startdate',
        name: 'const_startdate',
        width: '100px',
        sortable: true
      },
      {
        index: 'const_enddate',
        name: 'const_enddate',
        width: '100px',
        sortable: true
      },
      {index: 'manner', name: 'manner', width: '100px', sortable: true},
      {
        index: 'data_folder',
        name: 'data_folder',
        width: '400px',
        sortable: true
      },
    ],
    rowNum: 1000000,
    hoverrows: false,
    ondblClickRow: function(rowid, iRow, iCol, e) {
      let construction = getSelectedConstruction();
      if (!construction) return;

      viewMode.setNextMode(
          (mode === MODE_ONLYSELECTION) ? viewMode.MODE_TREE_VIEW :
                                          viewMode.MODE_BOOKRACK_VIEW,
          construction.constructionId);
      window.close();
    },
    onSortCol: function(index, iCol, sortorder) {
      let enable = index === 'comp_no' && mode === MODE_NORMAL;
      document.enableSortButton = enable;
      enableMoveConstructionButton(enable);
      oldIndex = selection.index;
      document.loadType = 'sort';
    },
    gridComplete: function() {
      if (oldIndex != null) {
        selection.id = selection.id;
        oldIndex = null;
      }
      if ($('#list tr').length - 1 > 0) {
        moveToLastPosition();
        switch (document.loadType) {
          case 'sort':
            sortComplete();
            break;
          case 'moveup':
            moveItemComplete(0);
            break;
          case 'movedown':
            moveItemComplete(1);
            break;
        }
        delete document.loadType;
      }
    }
  });
  $('#list').on('click', 'tr', (e) => {
    setStateButton();
  });
}

function moveToLastPosition() {
  let container = $('#list').closest('.ui-jqgrid-bdiv');
  let rowHeight = getGridRowHeight() || 23;
  container.scrollTop(rowHeight * startIndex);
}

function setStateButton() {
  if ((selection.index - 1) + '' === $('#list tr:nth-child(2)').attr('id')) {
    document.querySelector('#movebookrackup').disabled = true;
  } else {
    if (document.enableSortButton === true) {
      document.querySelector('#movebookrackdown').disabled = false;
    }
  }
  if ((selection.index + 1) + '' === $('#list tr:last-child').attr('id')) {
    document.querySelector('#movebookrackdown').disabled = true;
  } else {
    if (document.enableSortButton === true) {
      document.querySelector('#movebookrackup').disabled = false;
    }
  }
}

function sortComplete() {
  setStateButton();
  scrollToRow(selection.index != null ? selection.index : 1);
}

function moveItemComplete(dir) {
  scrollToRow(selection.index != null ? selection.index : 1);
}

function getGridRowHeight() {
  let height = null;
  height = $('#list tr:nth-child(2)').outerHeight();
  return height;
}

function scrollToRow(index) {
  index--;
  let rowsInPage = 13;
  let totalRows = $('#list tr').length - 1;
  let rowHeight = getGridRowHeight() || 23;
  let scrollY;
  let container = $('#list').closest('.ui-jqgrid-bdiv');

  // get current displayed section
  let sIndex = Math.round(container.scrollTop() / rowHeight);
  if (startIndex != null && sIndex === 0) {
    sIndex = startIndex;
  }

  if (index < sIndex) {
    if (index + rowsInPage <= totalRows) {
      startIndex = index;
      container.scrollTop(rowHeight * startIndex);
    } else {
      startIndex = totalRows - rowsInPage;
      container.scrollTop(rowHeight * startIndex);
    }
  } else if (index >= sIndex + rowsInPage) {
    startIndex = index - rowsInPage + 1;
    container.scrollTop(rowHeight * startIndex);
  }
}

function makeGridDataRow(construction, idx) {
  let compNo = ('0000' + idx).substr(-4);
  if (construction.isExternalFolder) {
    compNo = '<img src="../common/images/icon/folder.png"><span data-id="' +
        idx + '">' + compNo;
  } else {
    compNo = '<img src="./images/transparent.png"><span data-id="' + idx +
        '">' + compNo;
  }
  compNo += '</span>';
  var customer = getCustomer(construction);

  return {
    comp_no: compNo,
    comp_year: construction.year,
    const_no: construction.constructionNumber,
    const_name: construction.constructionName,
    customer_name: customer,
    const_startdate: construction.startDate,
    const_enddate: construction.endDate,
    manner: `[${construction.knack.knackName}]`,
    data_folder: construction.dataFolder,
  };
}

async function reloadGrid(index) {
  currentData = await bookrackAccessor.getConstructions();
  let newData =
      currentData.constructions.map((c, i) => makeGridDataRow(c, 1 + i));
  $('#list')
      .clearGridData()
      .jqGrid('setGridParam', {data: newData})
      .trigger('reloadGrid')
      .jqGrid('setGridWidth', {shrink: true})
      .trigger('reloadGrid');
  if (index == null) {
    index = 1;
  }
  selection.index = index;
  if (selection.index === 1) {
    document.querySelector('#movebookrackup').disabled = true;
  }
}

async function initialize() {
  // window mode detection.
  mode = (window.location.hash === MODE_ONLYSELECTION) ? MODE_ONLYSELECTION :
                                                         MODE_NORMAL;

  initGrid();
  buttonSetting();

  try {
    await reloadGrid();
  } catch (e) {
    console.log('error: ', e);
  }
}

$(function() {
  initialize()
});
})();

function getCustomer(construction) {
  var customer = '';
  if (construction.knack.knackType === 1 ||
      construction.knack.knackType === 3 ||
      construction.knack.knackType === 4 ||
      construction.knack.knackType === 8 ||
      construction.knack.knackType === 9) {
    customer = construction.contractee.contracteeName;
  } else {
    customer = '';
    if (construction.contractee.largeCategory !== undefined) {
      customer += construction.contractee.largeCategory + ' ';
    }

    if (construction.contractee.middleCategory !== undefined) {
      customer += construction.contractee.middleCategory + ' ';
    }

    if (construction.contractee.smallCategory !== undefined) {
      customer += construction.contractee.smallCategory;
    }
  }
  return customer;
}
