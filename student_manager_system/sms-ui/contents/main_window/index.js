(function () {
  'use strict';

  const { remote } = require('electron');
  const { viewMode } = remote.require('./lib/goyo-window-controller');
  const bookrackAccessor = remote.require('sms-accessor');
  const goyoConstructionOperation =
    remote.require('./lib/goyo-construction-operation');
  const bookrackPreview = remote.require('./lib/goyo-bookrack-preview');
  const goyoDialog = remote.require('./lib/goyo-dialog-utils');
  const fs = remote.require('fs');
  const path = remote.require('path');
  const goyoMigration = remote.require('goyo-migration');
  const goyoAppFolder = remote.require('./lib/goyo-appfolder');
  const logger = remote.require('./lib/goyo-log')('construction_window');
  const uiParam = remote.require('./lib/goyo-ui-parameters')('construction_window');
  const lockFactory = remote.require('./lib/lock-manager/goyo-lock-manager');
  const licenseManager = remote.require('./lib/license/goyo-license-manager');
  const goyoAppDefaults = remote.require('./lib/goyo-app-defaults');
  const escape = require('escape-html');

  //3rd-party-modules
  const fse = remote.require('fs-extra');

  const { app } = remote.require('electron');
  const MODE_ONLYSELECTION = '#mode.onlyselection';
  const MODE_NORMAL = '#mode.normal';
  var mode = MODE_NORMAL;
  const MIGRATION_RESULT_TITLE = '結果';
  const MIGRATION_RESULT_MESSAGE =
    `件の工事の読み込みが完了しました。<br><br>
下記の工事は読み込みに失敗、または変更がありました。`;
  const MIGRATION_RESULT_WINDOW = 'result';
  const migrationErrorLogTmp = '/goyoMigrationErrorlog';
  const migOpenNormalResultDialog = async (win,constNum) =>
    await goyoDialog.showSimpleMessageDialog(win, '結果', `${constNum}件の工事の読み込みが完了しました。`, 'OK');
  const migOpenCancelResultDialog = async (win) =>
    await goyoDialog.showSimpleMessageDialog(win, '結果', '工事の移行はキャンセルされました。', 'OK');
  const migOpenFailedResultDialog = async (win,count,failedList) =>
    await goyoDialog.showGoyo18DatamigrationAlertDialog(
      win,MIGRATION_RESULT_TITLE, count + MIGRATION_RESULT_MESSAGE,
      failedList, 'true', MIGRATION_RESULT_WINDOW);
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
  var getConstPromise = bookrackAccessor.getConstructions().catch(e => { logger.error('getConstructions', e); return []; });

  var bookrackIds = {};
  let startIndex;
  let newSelectionId;
  //dummy bookrackId
  let bookrackId = 99;
  let lastShowedConstructionId = 0;

  var storeHistoryAction = {
    preIndexTr: 1,
    isBorder: false,
    setPreIndexTr: function (index) {
      this.preIndexTr = index;
    },
    getPreIndexTr: function () {
      return this.preIndexTr;
    },
    setIsBorder: function (isBorder) {
      this.isBorder = isBorder;
    },
    getIsBorder: function () {
      return this.isBorder;
    }
  }

  let dataValueId = {
    data: 0,
    setData: function (data) {
      this.data = data;
    },
    getData: function () {
      return this.data;
    }
  }

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
        parseInt($('#list').jqGrid('getCell', this._index, 'comp_no'));
      $('#list').jqGrid('setSelection', value);
      if (typeof this._id !== "number") {
        this._id = 1;
      }
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

  let cursorStyle = {
    wait(){
      if(!cursorStyle.isWait){
        $('*').css("cursor","wait");
        cursorStyle.isWait = true;
      }
    },
    auto(){
      if(cursorStyle.isWait){
        $('*').css("cursor","auto");
        cursorStyle.isWait = false;
      }
    }
  };

  $(function () {
    initialize();

    $(document).on('click touchend', function (e) {
      if (!$(e.target).closest('#list').length &&
        $(e.target).closest('.ui-jqgrid-bdiv').length) {
        $("#list").jqGrid('resetSelection');
        document.querySelector('#movebookrackup').disabled = true;
        document.querySelector('#movebookrackdown').disabled = true;
      }
    });
    $('#list').on('click', 'tr', (e) => {
      $('.default').removeClass('default');
      $('.goyo-button-selected').removeClass('goyo-button-selected');
      $('.config-button-selected').removeClass('config-button-selected');
      $("#showbookrack").addClass('goyo-button-selected');
      storeHistoryAction.setIsBorder(true);
      selection.index = parseInt($(e.currentTarget).attr('id'));
      let dataId = $($($(e.currentTarget).children()[1]).children()[0]).children().attr('data-id');
      dataValueId.setData(dataId);
      setStateButton();
      disabledNotExist();
    });
    $(window).on('keydown', keyDownEvent);
  });

  $(document).on('mousedown', 'td', async function (event) {
    let nextIndex = parseInt(event.target.parentElement.id);
    let elements = getTabArrayElement();
    let oldIndex = storeHistoryAction.getPreIndexTr();
    removeAllBorderCls(elements);
    addBorderOrange(elements, nextIndex);
    $('#list').focus();
    $(`#list tr:eq(${oldIndex})`).removeClass('ui-state-highlight selected-hightlight');
    $(`#list tr:eq(${nextIndex})`).addClass('ui-state-highlight selected-hightlight');
    storeHistoryAction.setPreIndexTr(nextIndex);
  });

  async function initialize() {
    // window mode detection.
    mode = (window.location.hash === MODE_ONLYSELECTION) ? MODE_ONLYSELECTION : MODE_NORMAL;

    lastShowedConstructionId = uiParam.lastShowedConstructionId;

    initGrid();
    buttonSetting();
    document.getElementById("showbookrack").focus();

    try {
      currentData = await getConstPromise;
      await reloadGrid(false);
      if(currentData.constructions.length === 0) {
        document.querySelector('#showbookrack').disabled = true;
        document.querySelector('#editbookrack').disabled = true;
        document.querySelector('#deletebookrack').disabled = true;
        document.querySelector('#movebookrackup').disabled = true;
        document.querySelector('#movebookrackdown').disabled = true;
        return;
      }
      let isExist = false;
      for (let construction of currentData.constructions) {
        if (construction.constructionId === lastShowedConstructionId) {
          isExist = true;
          break;
        }
      }
      if (!isExist) {
        lastShowedConstructionId = 0;
      }
      setSelection(lastShowedConstructionId);
      setStateButton()
      disabledNotExist();

      let dataItemId = $($($('tr[tabindex="0"]').children()[1]).children()[0]).children().attr('data-id');
      dataValueId.setData(dataItemId);
    } catch (e) {
      logger.error('reloadGrid', e);
    }

    let constructionIds = currentData.constructions.map(c => c.constructionId);
    remote.require('./lib/goyo-ui-parameters').removeUnnecessaryConstructionKeys(constructionIds);
  }

  function initGrid() {
    document.enableSortButton = true;
    $('#list').jqGrid({
      data: DEFAULT_GRID_DATA,
      width: 810,
      height: 360,
      datatype: 'local',
      shrinkToFit: 1,
      scrollrows: true,
      colNames: [
        'hidden', 'No.', '年度', '工事番号', '工事名称', '発注者', '工期開始日',
        '工期終了日', '準拠する要領', 'データフォルダ'
      ],
      colModel: [
        { index: 'hidden', name: 'hidden', hidden: true },
        {
          index: 'comp_no',
          name: 'comp_no',
          width: uiParam.comp_no,
          sortable: true,
          sorttype: function (cell) {
            let no = null;
            if ($(cell).length === 2) {
              no = $(cell)[1].innerHTML;
            } else {
              no = $(cell)[0].firstChild.innerHTML;
            }

            return parseInt(no);
          },
          fixed: true
        },
        { index: 'comp_year', name: 'comp_year', width: uiParam.comp_year, sortable: true },
        { index: 'const_no', name: 'const_no', width: uiParam.const_no, sortable: true },
        { index: 'const_name', name: 'const_name', width: uiParam.const_name, sortable: true },
        {
          index: 'customer_name',
          name: 'customer_name',
          width: uiParam.customer_name,
          sortable: true
        },
        {
          index: 'const_startdate',
          name: 'const_startdate',
          width: uiParam.const_startdate,
          sortable: true
        },
        {
          index: 'const_enddate',
          name: 'const_enddate',
          width: uiParam.const_enddate,
          sortable: true
        },
        { index: 'manner', name: 'manner', width: uiParam.manner, sortable: true },
        {
          index: 'data_folder',
          name: 'data_folder',
          width: uiParam.data_folder,
          sortable: true
        },
      ],
      rowNum: bookrackAccessor.MAX_CONSTRUCTIONS,
      hoverrows: false,
      ondblClickRow: function (rowid, iRow, iCol, e) {
        $('#showbookrack').click();
      },
      onSortCol: function (index, iCol, sortorder) {
        let enable = index === 'comp_no' && mode === MODE_NORMAL;
        document.enableSortButton = enable;
        enableMoveConstructionButton(enable);
        document.loadType = 'sort';
        $('.default').removeClass('default');
        $('.goyo-button-selected').removeClass('goyo-button-selected');
        $('.config-button-selected').removeClass('config-button-selected');
        $("#showbookrack").addClass('goyo-button-selected');
        $("table#list").focus();
      },
      gridComplete: function () {
        if (document.loadType === 'sort') {
          moveToLastPosition();
          reloadComplete();
          delete document.loadType;
        }
      },
      loadComplete: function () {
        storeHistoryAction.setIsBorder(true);
        let rowArray = $("table#list").jqGrid('getDataIDs');
        let dataId = dataValueId.getData();
        for (let i = 0; i < rowArray.length; i++) {
          let dataRowId = $($($(`#${i + 1}`).children()[1]).children()[0]).children().attr('data-id');
          if (dataRowId === dataId) {
            storeHistoryAction.setIsBorder(true);
            let elements = getTabArrayElement();
            addBorderOrange(elements, i + 1);
            $("table#list").jqGrid('setSelection', rowArray[i], true);
            selection.index = $('#list').getGridParam("selrow");
            setStateButton();
            break;
          }
        }
      },
      resizeStop: function (newWidth, index) {
        let colModel = $("#list").jqGrid('getGridParam','colModel');
        let indexName = colModel[index];
        uiParam[indexName.index] = newWidth + 'px';
      },
    });
  }

  async function reloadGrid(reloadCurrentData = true) {
    if(reloadCurrentData) {
      currentData = await bookrackAccessor.getConstructions();
    }
    if(currentData.length === 0) {
      return [];
    }
    currentData.constructions.forEach(async (c) => {
      if (c.knack.knackName !== "要領不明") {
        bookrackIds[c.constructionId] = await findBookrackId(c.constructionId);
      } else {
        bookrackIds[c.constructionId] = 0;
      }
    });

    let newData =
      currentData.constructions.map((c, i) => makeGridDataRow(c, 1 + i));
    $('#list')
      .clearGridData()
      .jqGrid('setGridParam', { data: newData })
      .trigger('reloadGrid')
      .jqGrid('setGridWidth', { shrink: true })
      .trigger('reloadGrid');
    if ($('#list tr').length - 1 > 0) {
      moveToLastPosition();
      switch (document.loadType) {
        case 'moveitem':
        case 'delete':
          reloadComplete();
          break;
        case 'copy':
          selection.id = newSelectionId;
          reloadComplete();
          break;
      }
      delete document.loadType;
    }
    if (selection.index == null) {
      selection.index = 1;
    }
  }

  function makeGridDataRow(construction, idx) {
    let compNo = ('0000' + idx).substr(-4);
    let isExist = construction.knack.knackName === "要領不明" ? false : true;
    let isNetworkFolder = construction.dataFolder.match(/^\\\\/g) ? true : false;
    let imgElm;

    if (isNetworkFolder && isExist) {
      imgElm = '<img src="./images/sharedFolder.png">';
    } else if (isNetworkFolder) {
      imgElm = '<img src="./images/sharedFolder_dark.png">';
    } else if (construction.isExternalFolder && !isExist) {
      imgElm = '<img src="./images/folder_dark.png">';
    } else if (construction.isExternalFolder) {
      imgElm = '<img src="./images/folder.png">';
    } else {
      imgElm = '<span style="padding-left: 18px;">';
    }
    //compNo = `<span data-id="${idx}">${compNo}</span>`;
    var customer = getCustomer(construction);

    return {
      hidden: null,
      comp_no: imgElm + `<span data-id="${idx}">${escape(compNo)}</span>`,
      comp_year: escape(construction.year),
      const_no: escape(construction.constructionNumber),
      const_name: escape(construction.constructionName),
      customer_name: escape(customer),
      const_startdate: getDate(construction.startDate),
      const_enddate: getDate(construction.endDate),
      manner: `[${escape(construction.knack.knackName)}]`,
      data_folder: escape(construction.dataFolder),
    };
  }

  function getDate(date) {
    if (!date) {
      return '****';
    }
    let dateObj = new Date(date);
    return dateObj.getFullYear().toString() + "/" + ("0" + (dateObj.getMonth() + 1)).slice(-2).toString() + "/" + ("0" + dateObj.getDate()).slice(-2).toString();
  }

  function setSelection(constructionId) {
    for (let i = 0; i < currentData.constructions.length; i++) {
      if (currentData.constructions[i].constructionId === constructionId) {
        $('#list').jqGrid('setSelection', i + 1, true);
        break;
      }
    };
  }
  function buttonSetting() {
    // set style and action to buttons.
    if (mode === MODE_NORMAL) {
      document.querySelector('#addbookrack').onclick = async function () {
        if (!document.busy) {
          document.busy = true;
          let win = remote.getCurrentWindow();
          let construction = getSelectedConstruction();
          let result = "";
          let countConstruction = currentData.constructions.length;
          if (licenseManager.licenseType === 'trial' &&
            countConstruction >= goyoAppDefaults.TRIAL_MAX_CONSTRUCTIONS) {
            await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), 7);
            delete document.busy;
            addSelected(this);
            $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
            return;
          }
          if (construction && construction.knack.knackName !== "要領不明") {
            result = await goyoDialog.showNewConstructionSelectionDialog(win);
          }
          if (result === 'NEW' || result === "") {
            win.minimize();
            let progressWindow;
            try {
              let newId = await goyoConstructionOperation.create(win);
              if (newId) {
                if (false) {
                  // Disable the feature until bookrack preview is enabled.
                  let bookrackItems = bookrackPreview.dummyAccessor.getBookrackItems();
                  let systemAlbums = bookrackPreview.dummyAccessor.getSystemAlbums();
                  let bookrackItemsPreview, bookrackArray, done = 1, total = 0;
                  if (systemAlbums && systemAlbums.length > 0) {
                    total += systemAlbums.length - 1;
                  }
                  if (bookrackItems && bookrackItems.bookrackItems && bookrackItems.bookrackItems.length > 0) {
                    bookrackItemsPreview = JSON.parse(JSON.stringify(bookrackItems));
                    bookrackArray = convertBookrackItemsToArr(bookrackItemsPreview);
                    total += bookrackArray.length - 1;
                  }
                  if (systemAlbums && systemAlbums.length > 0) {
                    progressWindow = goyoDialog.showProgressDialog(win);
                    done = await updateSystemBookrackFromPreview(newId, systemAlbums, total, progressWindow, done);
                  }
                  if (bookrackItems && bookrackItems.bookrackItems && bookrackItems.bookrackItems.length > 0) {
                    if (!progressWindow) {
                      progressWindow = goyoDialog.showProgressDialog(win, () => { });
                    }
                    await createBookrackFromPreview(newId, bookrackItemsPreview.bookrackItems, 0, total, progressWindow, done);
                    await goyoConstructionOperation.reOrderBookrackFromPreview(newId);
                  }
                  if (progressWindow) {
                    await progressWindow.close();
                  }
                }

                bookrackId = await findBookrackId(newId);
                bookrackIds[newId] = bookrackId;
                viewMode.setNextMode(viewMode.MODE_BOOKRACK_VIEW, { constructionId: newId });
                goyoConstructionOperation.information.photoInformationTree = null;
                goyoConstructionOperation.information.pattern = null;
                goyoConstructionOperation.information.largeClassificationValue = null;
                uiParam.lastShowedConstructionId = newId;
                window.close();
              }
            } catch (e) {
              logger.error('goyoConstructionOperation.create', e);
              // TODO:タイトル、メッセージの統一
              await goyoDialog.showErrorMessageDialog(
                remote.getCurrentWindow(),
                'エラー',
                '工事情報の作成に失敗しました。',
                'OK');
            } finally {
              goyoConstructionOperation.information.photoInformationTree = null;
              goyoConstructionOperation.information.pattern = null;
              goyoConstructionOperation.information.largeClassificationValue = null;
              if (progressWindow) {
                await progressWindow.close();
              }
            }
            win.show();
          } else if (result === 'COPY') {
            if (construction) {
              try {
                const result =
                  await goyoConstructionOperation.copy(win, construction);
                if (result) {
                  document.loadType = 'copy';
                  newSelectionId = selection.id + 1;
                  let selectRow = parseInt($('#list').getGridParam("selrow"));
                  await reloadGrid();
                  $('#list').jqGrid('setSelection', selectRow + 1, true);
                }
              } catch (e) {
                logger.error('goyoConstructionOperation.copy', e);
                // TODO:タイトル、メッセージの統一
                await goyoDialog.showErrorMessageDialog(
                  remote.getCurrentWindow(),
                  'エラー',
                  '工事情報のコピーに失敗しました。',
                  'OK');
              }
            }
          }
          delete document.busy;
          addSelected(this);
          $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
        }
        setStateButton();
      };

      document.querySelector('#copybookrack').onclick = async function () {
        const notExistsDataFolderDialog = async (parentWin) =>
          goyoDialog.showErrorMessageDialog(parentWin, goyoAppDefaults.DIALOG_TITLE,
                                            '御用達15～18のデータフォルダがありません', 'OK');
        const errorDataFolderDialog = async (parentWin) =>
          goyoDialog.showErrorMessageDialog(parentWin, goyoAppDefaults.DIALOG_TITLE,
                                            '御用達15～18のデータフォルダがありません。\nもしくは、御用達15～18のデータフォルダが不正です。', 'OK');
        const progressShow = parentWin => progressCallback(null, null, null, null, null, 'on', parentWin);
        const progressOff = async () =>await progressCallback('', '', '', '', null, 'off');
        const migrationLogger = remote.require('./lib/goyo-log')('migration');
        if (!document.busy) {
          document.busy = true;
          var win = remote.getCurrentWindow();
          const pathList = await goyoAppFolder.goyo18GasukeFolderList();
          let nameList;
          if (pathList) {
            nameList = pathList.nameList;
          } else {
            await notExistsDataFolderDialog(win);
            btnProcessEnd(this);
            return;
          }
          let goyo18Path;
          if( nameList.length===1 ){
            goyo18Path = pathList.pathList[0];
          }else if (nameList.length > 1) {
            let type = 'migration_path_select';
            const selectPath =
              await goyoDialog.showKuraemonDriveListDialog(win, nameList, type);
            if (!selectPath) {
              btnProcessEnd(this);
              return;
            }
            const pathIndex = nameList.findIndex(val => val === selectPath);
            goyo18Path = pathList.pathList[pathIndex];
          }
          var goyo20Path = goyoAppFolder.getAppDataFolder();
          let initilizeResult = goyoMigration.initilize(goyo18Path, goyo20Path,migrationLogger);
          if (initilizeResult) {
            var result = await goyoDialog.showCopyOldConstructionDialog(win);
          }
          //Processing when there is no construction or when initilize fails
          if (!(initilizeResult) || result === 'error') {
            await errorDataFolderDialog(win);
            btnProcessEnd(this);
            return;
          }
          //Process start when migratable construction is selected
          if (result) {
            let migrationIdList = [];
            for (let itr of result) {
              let obj = {
                const_name: itr.constructionName,
                constructionId: itr.constructionId,
                constructionObj: itr
              }
              migrationIdList.push(obj);
            }
            let failedConstrucionList = [];
            if(licenseManager.licenseType == 'trial'){
              let isprocced = await showTrialDialogIfConsMakeMax(migrationIdList,win);
              if(isprocced){
                btnProcessEnd(this);
                return;
              }
            }
            //goyo18 construction migration progress
            const migrationTmp = app.getPath('temp') + '/goyoMigrationTmp';
            progressShow(win);
            await goyoMigration.totalAlbumCount(migrationIdList);
            let constructionCount = 0;
            let isMigrationCanceled;
            let errorCounter = {
              construction:0,
              total:0
            }
            let makeErrorLogPath = goyo20Path+migrationErrorLogTmp;
            try {
              fse.ensureDirSync(makeErrorLogPath);
              let {writer,errorLogFilePath} = migrationErrorLogMaker.createWriter(fs,makeErrorLogPath,errorCounter);
              for (let itr of migrationIdList) {
                let callback = migrationErrorLogMaker.createCustomWriter(errorCounter,writer);
                constructionCount++;
                let migrationResult =
                  await goyoMigration.
                    constructionMigration(itr['constructionId'], progressCallback,
                      migrationTmp, itr['constructionObj'],callback);
                if (migrationResult['status'] === 'abnormal') {
                  failedConstrucionList.push(itr.const_name);
                }
                if (migrationResult['status'] === 'cancel') {
                  failedConstrucionList.push(itr.const_name);
                  isMigrationCanceled = true;
                  --constructionCount;
                }
              }
              writer.end();
              await goyoMigration.finalize();
              //result window
              let isNotAnyMigrate = isMigrationCanceled && constructionCount === 0;
              if (isNotAnyMigrate) {
                await progressOff();
                await migOpenCancelResultDialog(win);
                btnProcessEnd(this);
                return
              }
              await reloadGrid();
              await progressOff();
              scrollToTargetRow('#list', currentData.constructions.length);
              let isFailed = failedConstrucionList.length !== 0 && constructionCount !== 0;
              if (isFailed) {
                let count = result.length;
                let isOpenErrolog =
                  await migOpenFailedResultDialog(win,count,failedConstrucionList);
                if (isOpenErrolog) {
                  var exec = remote.require('child_process').exec;
                  exec(`C:/WINDOWS/system32/notepad.exe ${errorLogFilePath}`);
                }
              } else {
                await migOpenNormalResultDialog(win,constructionCount);
              }
            } catch (e) {
              migrationLogger.error(`result|${e}`);
              await progressOff();
              await goyoDialog.showErrorMessageDialog(win, 'エラー', 'データ移行に失敗しました。', 'OK');
            }
          }
          btnProcessEnd(this);
        }
      };

      document.querySelector('#showbookrack').onclick = async function () {
        if (!document.busy) {
          document.busy = true;

          try {
            // get selected construction or show warning message.
            let construction = getSelectedConstruction();
            if (!construction) {
              await goyoDialog.showWarningMessageDialog(
                remote.getCurrentWindow(),
                '工事一覧',
                '工事を選択してください。',
                'OK'
              );
              return;
            }
            if (construction.knack.knackName === "要領不明") return;

            let constructionId = construction.constructionId;
            let latestConstructions = (await bookrackAccessor.getConstructions()).constructions;
            let latestConstruction = latestConstructions[construction.displayNumber - 1]
            if(latestConstruction.knack.knackName === '要領不明') {
              await goyoDialog.showWarningMessageDialog(
                remote.getCurrentWindow(),
                '工事一覧',
                '切り替える工事の本棚は、現在使用できません。',
                'OK'
              );
              return;
            }
            
            let licenseCheck = checkLicenseAndSharedConstruction(construction);
            if (licenseCheck !== 0) {
              await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), licenseCheck);
              return;
            }

            bookrackId = bookrackIds[constructionId];
            viewMode.setNextMode(
              viewMode.MODE_BOOKRACK_VIEW, { constructionId });
            uiParam.lastShowedConstructionId = constructionId;
            window.close();
          } catch(e) {
            logger.error('Failed to showBookrack', e);
          } finally {
            delete document.busy;
          }
        }
      };

      document.querySelector('#editbookrack').onclick = async function () {
        async function checkSharedLock(constructionId) {
          try {
            let lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
            let others = await lockManager.existSharedLockOwners();
            logger.debug(`constructionId=${constructionId}, checkSharedLock=${others}`);
            if (others) {
              await goyoDialog.showConstructionShareLockBusyDialog(
                remote.getCurrentWindow(), others.length);
              return true;
            }
          } catch (e) {
            logger.error('Failed to lockManager', e);
          }
          return false;
        }

        if (!document.busy) {
          document.busy = true;
          // get selected construction or show warning message.
          let construction = getSelectedConstruction();
          if (!construction) {
            await goyoDialog.showWarningMessageDialog(
              remote.getCurrentWindow(),
              '工事一覧',
              '工事を選択してください',
              'OK'
            );
            delete document.busy;
            return;
          }
          let win = remote.getCurrentWindow();
          // check other shared lock Construction
          if (await checkSharedLock(construction.constructionId)) {
            delete document.busy;
            return;
          }

          try {
            win.minimize();
            await goyoConstructionOperation.edit(win, construction.constructionId);
            let selectRow = parseInt($('#list').getGridParam("selrow"));
            await reloadGrid();
            $('#list').jqGrid('setSelection', selectRow, true);
          } catch (e) {
            logger.error('goyoConstructionOperation.edit', e);
            // TODO:タイトル、メッセージの統一
            await goyoDialog.showErrorMessageDialog(
              remote.getCurrentWindow(),
              'エラー',
              '工事情報の更新に失敗しました。',
              'OK');
          } finally {
            win.show();
            delete document.busy;
          }
          addSelected(this);
          $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
        }
      };

      document.querySelector('#deletebookrack').onclick = async function () {
        if (!document.busy) {
          document.busy = true;
          let construction = getSelectedConstruction();

          if (!construction) {
            await goyoDialog.showWarningMessageDialog(
              remote.getCurrentWindow(),
              '工事一覧',
              '工事を選択してください。',
              'OK'
            );
          } else {
            let win = remote.getCurrentWindow();
            cursorStyle.wait();
            try {
              let result = await goyoConstructionOperation.delete(win, construction);
              if (result === true) {
                document.loadType = 'delete';
                await reloadGrid();
                if (lastShowedConstructionId !== 0 && lastShowedConstructionId !== construction.constructionId) {
                  setSelection(lastShowedConstructionId);
                } else {
                  if (selection.index > currentData.constructions.length) {
                    selection.id = currentData.constructions.length;
                    $('#list').jqGrid('setSelection', selection.id, true);
                  } else {
                    $('#list').jqGrid('setSelection', selection.index, true);
                  }
                  lastShowedConstructionId = 0;
                }
                setStateButton();
              }
            } catch (e) {
              logger.error('goyoConstructionOperation.delete', e);
              await goyoDialog.showErrorMessageDialog(
                remote.getCurrentWindow(),
                'エラー',
                '工事情報の削除に失敗しました。',
                'OK');
            } finally {
              cursorStyle.auto();
              $('.ui-jqgrid-resize').css("cursor", "col-resize");
            }
          }

          delete document.busy;
          addSelected(this);
          $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
        }
      };

      document.querySelector('#movebookrackup').onclick = async function () {
        if (!document.busy) {
          document.busy = true;
          let index = 0;
          let construction = {};
          $.extend(true, construction, getSelectedConstruction());
          if (construction != undefined) {
            let newDisplayNumber = sortDir() === true ? construction.displayNumber - 1 : construction.displayNumber + 1;
            let otherConstruction = {};
            $.extend(true, otherConstruction, currentData.constructions[newDisplayNumber - 1]);
            let constructions = [
              {
                "constructionId": construction.constructionId,
                "displayNumber": newDisplayNumber,
              },
              {
                "constructionId": otherConstruction.constructionId,
                "displayNumber": construction.displayNumber,
              },
            ];
            otherConstruction.displayNumber = construction.displayNumber;
            construction.displayNumber = newDisplayNumber;
            let newCurrentData = {};
            $.extend(true, newCurrentData, currentData);
            newCurrentData.constructions[newDisplayNumber] = otherConstruction;
            newCurrentData.constructions[newDisplayNumber - 1] = construction;
            currentData = newCurrentData;
            try {
              await goyoConstructionOperation.movePosition(constructions);
              document.loadType = 'moveitem';
              index = sortDir() === true ? newDisplayNumber: currentData.constructions.length - newDisplayNumber + 1;
            } catch (e) {
              logger.error('goyoConstructionOperation.movePosition', e);
              await goyoDialog.showErrorMessageDialog(
                remote.getCurrentWindow(),
                'エラー',
                '工事情報の移動に失敗しました。',
                'OK');
            }
            await reloadGrid(false);
            let dataId = $($($(`#${newDisplayNumber}`).children()[1]).children()[0]).children().attr('data-id');
            dataValueId.setData(dataId);
            $('#list').jqGrid('setSelection', index + 1, true);
            selection.index = index;
            $('.config-button-selected').removeClass('config-button-selected');
            $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
            disabledNotExist();
            setStateButton();
          }
          delete document.busy;
          addSelected(this);
        }
      };

      document.querySelector('#movebookrackdown').onclick = async function () {
        if (!document.busy) {
          document.busy = true;
          let index = 0;
          let construction = {};
          $.extend(true, construction, getSelectedConstruction());
          if (construction != undefined) {
            let newDisplayNumber = sortDir() === true ? construction.displayNumber + 1 : construction.displayNumber - 1;
            let otherConstruction = {};
            $.extend(true, otherConstruction, currentData.constructions[newDisplayNumber - 1]);
            let constructions = [
              {
                "constructionId": construction.constructionId,
                "displayNumber": newDisplayNumber,
              },
              {
                "constructionId": otherConstruction.constructionId,
                "displayNumber": construction.displayNumber,
              },
            ];
            otherConstruction.displayNumber = construction.displayNumber;
            construction.displayNumber = newDisplayNumber;
            let newCurrentData = {};
            $.extend(true, newCurrentData, currentData);
            newCurrentData.constructions[newDisplayNumber - 2] = otherConstruction;
            newCurrentData.constructions[newDisplayNumber - 1] = construction;
            currentData = newCurrentData;
            try {
              await goyoConstructionOperation.movePosition(constructions);
              document.loadType = 'moveitem';
              index = sortDir() === true ? newDisplayNumber: currentData.constructions.length - newDisplayNumber + 1;
            } catch (e) {
              logger.error('goyoConstructionOperation.movePosition', e);
              await goyoDialog.showErrorMessageDialog(
                remote.getCurrentWindow(),
                'エラー',
                '工事情報の移動に失敗しました。',
                'OK');
            }
            await reloadGrid(false);
            let dataId = $($($(`#${newDisplayNumber}`).children()[1]).children()[0]).children().attr('data-id');
            dataValueId.setData(dataId);
            $('#list').jqGrid('setSelection', index + 1, true);
            selection.index = index;
            $('.config-button-selected').removeClass('config-button-selected');
            $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
            disabledNotExist();
            setStateButton();
          }
          delete document.busy;
          addSelected(this);
        }
      };

      document.querySelector('#sharebookrack').onclick = async function () {
        if (!document.busy) {
          document.busy = true;
          try {
            if (licenseManager.licenseType === 'trial' ) {
              await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), 9);
            } else if(licenseManager.licenseType === 'standard' ) {
              await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), 13);
            } else {
              let folderPath = await goyoDialog.showFolderSelectionDialog(
                remote.getCurrentWindow(),
                "共有する本棚のデータフォルダを選択してください",
                "",
                false);
              if (folderPath && folderPath[0]) {
                logger.debug('select folder ' + folderPath[0]);
                let newDataFolder = folderPath[0];
  
                let { constructions } = await bookrackAccessor.getConstructions();
                let result = await valifySharedConstructionDataFolder(constructions, newDataFolder);
                if (!result) {
                  return false;
                }
  
                let { constructionId } = await bookrackAccessor.importConstruction(newDataFolder, true, true, 0, false);
                logger.debug(`import constructionId=${constructionId}`);
  
                try {
                  await bookrackAccessor.execSharedConstruction(constructionId, true);
                } catch (e) {
                  await bookrackAccessor.deleteConstruction(constructionId, false);
                  throw e;
                }
                await reloadGrid();
                $('#list').jqGrid('setSelection', constructions.length + 1, true);
              }
            }
          } catch (e) {
            logger.error('Failed to sharebookrack.onclick', e);
            await goyoDialog.showWarningMessageDialog(
              remote.getCurrentWindow(),
              '工事一覧',
              '指定したフォルダは共有することができません。',
              'OK'
            );
          } finally {
            delete document.busy;
            addSelected(this);
            $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
          }
        }
      };
      document.querySelector('#quit').onclick = function () {
        window.close();
      };
    } else if (mode === MODE_ONLYSELECTION) {
      // All buttons except showbookrack is disabled in ONLYSELECTION mode.
      document.querySelector('#addbookrack').disabled = true;
      document.querySelector('#sharebookrack').disabled = true;
      document.querySelector('#deletebookrack').disabled = true;
      document.querySelector('#editbookrack').disabled = true;
      document.querySelector('#copybookrack').disabled = true;
      enableMoveConstructionButton(false);
      // showbookrack button kicks window transition to TreeView.
      document.querySelector('#showbookrack').onclick = async function () {
        let construction = getSelectedConstruction();
        if (!construction) {
          await goyoDialog.showSimpleMessageDialog(
            remote.getCurrentWindow(), '工事一覧', '工事を選択してください。',
            'OK');
        } else {
          let constructionId = construction.constructionId;

          let licenseCheck = checkLicenseAndSharedConstruction(construction);
          if (licenseCheck !== 0) {
            await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), licenseCheck);
            return;
          }

          viewMode.setNextMode(
            viewMode.MODE_TREE_VIEW, { constructionId });
          uiParam.lastShowedConstructionId = constructionId;
          window.close();
        }
      };
      document.querySelector('#quit').onclick = function () {
        window.close();
      };

    }
  }

  async function valifySharedConstructionDataFolder(constructions, newDataFolder) {
    let defaultFolders = [
      goyoAppFolder.getAppDataFolder(),
      goyoAppFolder.getAppFolder()
    ];
    for (let folder of defaultFolders) {
      if (newDataFolder.indexOf(folder) != -1) {
        await goyoDialog.showWarningMessageDialog(
          remote.getCurrentWindow(),
          '工事一覧',
          '指定したフォルダは共有することができません。',
          'OK'
        );
        return false;
      }
    }
    let netProfile = path.join(newDataFolder, 'NetProf.dat');
    if (!fse.existsSync(netProfile)) {
      await goyoDialog.showWarningMessageDialog(
        remote.getCurrentWindow(),
        '工事一覧',
        '指定したフォルダは共有することができません。',
        'OK'
      );
      return false;
    }
    for (let construction of constructions) {
      if (newDataFolder === construction.dataFolder) {
        let message = '指定したフォルダはすでに共有しています。';
        if (construction.isSharedFolder === false) {
          message = '指定したフォルダは共有することができません。';
        }
        await goyoDialog.showWarningMessageDialog(
          remote.getCurrentWindow(),
          '工事一覧',
          message,
          'OK'
        );
        return false;
      }
    }
    return true;
  }

  function sortDir() {
    if ($('#list').jqGrid('getGridParam', 'sortname') === 'comp_no') {
      return $('#list').jqGrid('getGridParam', 'sortorder') === 'desc' ? false :
        true;
    } else {
      return true;
    }
  };

  function getSelectedConstruction() {
    let row = $('#list').getGridParam("selrow");
    let id = $($('#list').jqGrid('getCell', row, 'comp_no')).children().attr('data-id');
    if(id === undefined) {
      id = $($($('#list').jqGrid('getCell', row, 'comp_no'))[1]).attr('data-id');
    }

    if (row) {
      if(sortDir()) {
        return currentData.constructions[id - 1];
      } else {
        return currentData.constructions[currentData.constructions.length - row];
      }
    } else {
      return null;
    }
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

  function moveToLastPosition() {
    let container = $('#list').closest('.ui-jqgrid-bdiv');
    let rowHeight = getGridRowHeight() || 23;
    container.scrollTop(rowHeight * startIndex);
  }

  function scrollToTargetRow(targetGrid, targetId) {
    var rowHeight = getGridRowHeight(targetGrid) || 26; // Default height
    var index = jQuery(targetGrid).getInd(targetId);
    jQuery(targetGrid).closest(".ui-jqgrid-bdiv").scrollTop(rowHeight * index);
    $(targetGrid).jqGrid('setSelection', targetId, true);
    setStateButton();
  }

  function setStateButton() {
    if (mode === MODE_ONLYSELECTION) {
      return;
    }
    if ($('#list tr').length === 1) {
      document.querySelector('#movebookrackup').disabled = false;
      document.querySelector('#movebookrackdown').disabled = false;
    } else {
      if (selection.index === 1) {
        document.querySelector('#movebookrackup').disabled = true;
      } else {
        if (document.enableSortButton === true) {
          document.querySelector('#movebookrackup').disabled = false;
        }
      }
      if (selection.index === $('#list tr').length - 1) {
        document.querySelector('#movebookrackdown').disabled = true;
      } else {
        if (document.enableSortButton === true) {
          document.querySelector('#movebookrackdown').disabled = false;
        }
      }
    }
  }

  function disabledNotExist() {
    let construction = getSelectedConstruction();
    if (construction.knack.knackName === "要領不明") {
      document.querySelector('#showbookrack').disabled = true;
      document.querySelector('#sharebookrack').disabled = true;
      document.querySelector('#editbookrack').disabled = true;
    } else {
      let modeSelectionOnly = mode == MODE_ONLYSELECTION;
      document.querySelector('#showbookrack').disabled = false;
      document.querySelector('#sharebookrack').disabled = modeSelectionOnly;
      // ------------------------
      document.querySelector('#editbookrack').disabled = modeSelectionOnly;
    }
  }

  function reloadComplete() {
    setStateButton();
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

  async function findBookrackId(constructionId) {
    try {
      // TODO:return the appropriate bookrackId
      let bookracks = (await bookrackAccessor.getBookrackItems(parseInt(constructionId))).bookrackItems;
      let bookrackId = 1;
      for (let i = 0; i < bookracks.length; i++) {
        if (bookracks[i].specialType === 0) {
          bookrackId = bookracks[i].bookrackItemId;
          break;
        }
      }
      return bookrackId;

    } catch (e) {
      logger.error('getBookrackItems', e);
      return 1;
    }
  }

  async function updateSystemBookrackFromPreview(constructionId, albums, total, progressWindow, done) {

  }

  async function createBookrackFromPreview(constructionId, bookrackItems, parentId, total, progressWindow, done) {
    try {
      for (let i = 0; i < bookrackItems.length; i++) {
        bookrackItems[i].bookrackItemId = 0;
        bookrackItems[i].parentBookrackItemId = parentId;
        if (bookrackItems[i].bookrackItemType !== 3) {
          let tmpBookrackItems;
          if (bookrackItems[i].bookrackItems && bookrackItems[i].bookrackItems.length > 0) {
            tmpBookrackItems = JSON.parse(JSON.stringify(bookrackItems[i].bookrackItems));
            delete bookrackItems[i].bookrackItems;
          }
          let result = await bookrackAccessor.updateBookrackItem(constructionId, bookrackItems[i]);
          if (progressWindow) {
            progressWindow.setProgress((done + 1) / total);
          }
          if (tmpBookrackItems) {
            done = await createBookrackFromPreview(constructionId, tmpBookrackItems, result.bookrackItemId, total, progressWindow, done);
          }
        }
        done += 1;
      }
      return done;
    } catch (e) {
      logger.error(e);
    }
  }

  function convertBookrackItemsToArr(items) {
    let allItems = [];
    allItems.push(items);
    if (items.bookrackItems.length > 0) {
      for (let i of items.bookrackItems) {
        allItems = allItems.concat(convertBookrackItemsToArr(i));
      }
    }
    return allItems;
  }

  var progressCallback = async function (obj, done, total, working, progressObject,
    progressSwitch, parentWin, optionValue) {
    let migrationProgress = null;
    if (progressObject) {
      let migrateAlbumTotal = progressObject.migrateAlbumTotal;
      migrateAlbumTotal? progressCallback.migrateAlbumTotal = migrateAlbumTotal:null;
      //get constructionName
      let constructionName = progressObject.constructionName;
      progressCallback.progressWindow.setProgressName(constructionName);
      // Set the progress rate
      let albumFrameCount = progressObject.albumFrameCount;
      if(albumFrameCount){
        progressCallback.countPoint = 100 / albumFrameCount / 100;
      }
    }
    //call one time case;
    if (parentWin) {
      progressCallback.parentWin = parentWin;
      progressCallback.isCanceled = false;
      var progressWindow = goyoDialog.showProgressMovieDialog(
        progressCallback.parentWin,
        async (currentWindow) => {
          const elec = require('electron').remote;
          const dialogUtil = elec.require('./lib/goyo-dialog-utils');
          let dialogResult = await dialogUtil.showWarningMessageDialog(
            currentWindow,
            '警告',
            '読み込みをキャンセルしますか？',
            'はい',
            'いいえ'
          );
          if(dialogResult) {
            progressCallback.isCanceled = true;
          }
        }
      );
      progressCallback.progressWindow = progressWindow;
      progressCallback.ProgressCount = 0;
      progressCallback.countPoint = 0.01;
      progressCallback.isCanceled = false;
      progressCallback.isClosedProgressWindow = false;
    }
    //cancel click case
    if (progressCallback.isCanceled) {
      if (!progressCallback.isClosedProgressWindow) {
        goyoMigration.status.setStatus(goyoMigration.status.CANCEL);
        progressCallback.isClosedProgressWindow = true;
        progressCallback.progressWindow.canceling();
      }
      progressCallback.isCanceled = true;
    }
    // normal case
    if (done && !progressCallback.isCanceled) {
      let migrateAlbumTotal = progressCallback.migrateAlbumTotal;
      //0.08以上であれば0.1に繰り上げする.進捗表示の見栄えの為
      progressCallback.ProgressCount += progressCallback.countPoint;
      let count = progressCallback.ProgressCount;
      let zeroPointNum = Math.floor(count / migrateAlbumTotal * 10) / 10;
      migrationProgress = Math.round((count / migrateAlbumTotal) * 100) / 100;
      let zeroPintZeroNum = migrationProgress - zeroPointNum;
      if (zeroPintZeroNum >= 0.08) {
        migrationProgress = Math.round(migrationProgress * 10) / 10;
      }
      progressCallback.progressWindow.setProgress(migrationProgress);
    }
    if (progressSwitch === 'off') {
      progressCallback.albumTotalProgress = 0;
      progressCallback.progressWindow.setProgress(1);
      if (progressCallback.isClosedProgressWindow) {
        await progressCallback.progressWindow.close();
        return;
      }
      await progressCallback.progressWindow.close();
    } else if (progressSwitch === 'on') {
      progressCallback.progressWindow.setProgress(0.01);
    }
  };

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

  function getGridRowHeight(targetGrid) {
    var height = null; // Default
    try {
      height = jQuery(targetGrid).find('tbody').find('tr#1').outerHeight();
    }
    catch (e) {
    }
    return height;
  }

  let arrayElementFocusTagName = ['TABLE', 'BUTTON'];
  let arrayElementFocusAttr = ['#list', '#addbookrack', '#sharebookrack', '#copybookrack',
    '#movebookrackup', '#movebookrackdown', '#deletebookrack',
    '#editbookrack', '#showbookrack', '#quit'];

  $(document).on('click', 'html', async function (e) {
    let tagName = document.activeElement.tagName;
    for (let attr of arrayElementFocusAttr) {
      if (!arrayElementFocusTagName.includes(tagName) && $(attr + ' ' + 'td').hasClass('border-orange-top-bottom')) {
        $(attr).focus();
      }
      if (!arrayElementFocusTagName.includes(tagName) && $(attr).hasClass('config-button-selected')) {
        $(attr).focus();
      }
      if (!arrayElementFocusTagName.includes(tagName) && $(attr).hasClass('default')) {
        $(attr).focus();
      }
    }
  });

  $(document).on('contextmenu', 'html', async function (e) {
    let tagName = document.activeElement.tagName;
    for (let attr of arrayElementFocusAttr) {
      if (!arrayElementFocusTagName.includes(tagName) && $(attr + ' ' + 'td').hasClass('border-orange-top-bottom')) {
        $(attr).focus();
      }
      if (!arrayElementFocusTagName.includes(tagName) && $(attr).hasClass('config-button-selected')) {
        $(attr).focus();
      }
      if (!arrayElementFocusTagName.includes(tagName) && $(attr).hasClass('default')) {
        $(attr).focus();
      }
    }
  });

  function keyDownEvent(event) {
    let elements = getTabArrayElement();
    let tabIndex = findIndex(elements, event.target);
    storeHistoryAction.setPreIndexTr(selection.index);
    let oldIndex = storeHistoryAction.getPreIndexTr();
    let newIndex = -1;

    startIndex = selection.index;
    if (tabIndex == -1) {
      tabIndex = 0;
    }

    switch (event.key) {
      case "Tab":
        event.preventDefault();
        if (event.shiftKey) {
          tabIndex = tabIndex - 1;
          if (tabIndex < 0) {
            tabIndex = elements.length - 1
          };
        } else {
          tabIndex += 1;
          if (tabIndex > elements.length - 1) {
            tabIndex = 0;
          }
          if (event.target.tagName == "BODY") {
            tabIndex = 0;
          }
        }
        changeFocusElement(event, elements, tabIndex);
        break;
      case "Enter":
        let construction = getSelectedConstruction();
        if (!construction || construction.knack.knackName === "要領不明") return;
        if (event.target.tagName == "TABLE" || event.target.tagName == "TR" || event.target.tagName == "TD") {
          $('#showbookrack').click();
        }
        break;
      case "ArrowLeft":
        if (event.target.tagName == "BUTTON") {
          event.preventDefault();
          tabIndex -= 1;
          changeFocusElement(event, elements, tabIndex);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (event.target.tagName == "TABLE" || event.target.tagName == "TR" || event.target.tagName == "TD") {
          newIndex = oldIndex - 1;
          if (newIndex < 1) {
            return;
          }
          moveRow(elements, newIndex);
          scrollToRow(newIndex);
          selection.index = selection.index - 1;
          setStateButton();
        } else if (event.target.tagName == "BUTTON") {
          tabIndex -= 1;
          changeFocusElement(event, elements, tabIndex);
        }
        break;
      case "ArrowRight":
        if (event.target.tagName == "BUTTON") {
          event.preventDefault();
          tabIndex += 1;
          if (tabIndex > elements.length - 1) {
            tabIndex = 0;
          }
          changeFocusElement(event, elements, tabIndex);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        switch (event.target.tagName) {
          case "TABLE":
          case "TR":
          case "TD":
            newIndex = oldIndex + 1;
            if (newIndex > elements[0].rows.length - 1) {
              return;
            }
            moveRow(elements, newIndex);
            scrollToRow(newIndex);
            selection.index = selection.index + 1;
            setStateButton();
            break;
          case "BUTTON":
            if (event.target.tagName == "BUTTON") {
              tabIndex += 1;
              if (tabIndex > elements.length - 1) {
                tabIndex = 0;
              }
              changeFocusElement(event, elements, tabIndex);
            }
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
  }

  function changeFocusElement(event, elements, tabIndex) {
    $('.default').removeClass('default');
    let nextElement = elements[tabIndex];
    nextElement.focus();
    let nextElementId = nextElement.id;
    if (nextElement.tagName == "TABLE") {
      storeHistoryAction.setIsBorder(true);
      let indexTr = findRowIsSelected(nextElementId);
      addBorderOrange(elements, indexTr);
      $('.config-button-selected').removeClass('config-button-selected');
    } else if (nextElement.tagName == "BUTTON") {
      storeHistoryAction.setIsBorder(false);
      removeAllBorderCls(elements);
      addConfigButton(nextElement);
    }
    addSelected(nextElement);
  }

  function getTabArrayElement() {
    let elements = [];
    let es = $('table:visible');
    if (es.length > 0) {
      for (let i = 0; i < es.length; i++) {
        if (es[i].id == "list") {
          elements.push(es[i]);
        }
      }
    }
    es = $('button:visible');
    if (es.length > 0) {
      for (let i = 0; i < es.length; i++) {
        if (es[i].disabled != true) {
          elements.push(es[i]);
        }
      }
    }
    return elements;
  }

  function findIndex(elements, findElement) {
    for (let i = 1; i < elements.length; i++) {
      if (elements[i] == findElement)
        return i;
    }
    return -1;
  }

  function findRowIsSelected(tableId) {
    let rows = $('#' + tableId + ' > tbody > tr');
    let arrRows = Array.from(rows);
    for (let i = 1; i < arrRows.length; i++) {
      let arrClassesName = rows[i].className;
      if (arrClassesName.includes('ui-state-highlight')) {
        return rows[i].id;
      }
      if (arrClassesName.includes('selected-hightlight')) {
        return rows[i].id;
      }
    }
    return -1;
  }

  function scrollToRow(index) {
    index--;
    let rowsInPage = 13;
    let totalRows = $('#list tr').length - 1;
    let rowHeight = getGridRowHeight() || 23;
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

  function moveRow(elements, newIndex) {
    let oldIndex = storeHistoryAction.getPreIndexTr();
    let tableId = 'list';
    removeAllBorderCls(elements);
    $(`#${tableId} tr:eq(${oldIndex})`).removeClass('ui-state-highlight selected-hightlight');
    $(`#${tableId} tr:eq(${newIndex})`).addClass('ui-state-highlight selected-hightlight');
    if (storeHistoryAction.getIsBorder()) {
      addBorderOrange(elements, newIndex);
    }
    storeHistoryAction.setPreIndexTr(newIndex);
  }
  // border
  function addBorderOrange(elements, indexTr) {
    let tableId = elements[0].id;
    if (indexTr) {
      let tds = $(`#${tableId} tr:nth-child(${indexTr})`).children();
      let arrTds = Array.from(tds);
      let length = arrTds.length;
      for (let i = 0; i < length; i++) {
        if (i == 1) {
          $(`#${tableId} tr:eq(${indexTr}) td:eq(${i})`).addClass('border-orange-left-top-bottom')
        } else if (i == length - 1) {
          $(`#${tableId} tr:eq(${indexTr}) td:eq(${i})`).addClass('border-orange-right-top-bottom')
        } else {
          $(`#${tableId} tr:eq(${indexTr}) td:eq(${i})`).addClass('border-orange-top-bottom')
        }
      }
    }
  }

  function removeAllBorderCls(elements) {
    let tableId = elements[0].id;
    let indexTr = findRowIsSelected(tableId);
    let tds = $(`#${tableId} tr:nth-child(${indexTr})`).children();
    let arrTds = Array.from(tds);
    let length = arrTds.length;
    for (let i = 0; i < length; i++) {
      $(`#${tableId} tr:eq(${indexTr}) td:eq(${i})`).removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
    }
  }

  function addSelected(elm) {
    $('.goyo-button-selected').removeClass('goyo-button-selected');
    $(elm).addClass('goyo-button-selected');
  }

  function addConfigButton(elm) {
    $('.config-button-selected').removeClass('config-button-selected');
    $(elm).addClass('config-button-selected');
  }

  function checkLicenseAndSharedConstruction(construction) {
    if (licenseManager.licenseType === 'trial' &&
      construction.isSharedFolder) {
        return 9;
    }
    if (licenseManager.licenseType === 'standard' &&
      construction.isSharedFolder) {
        return 13;
    }
    return 0;
  }

  let migrationErrorLogMaker = {
    createWriter(fs,makeFilePath,counter){
      function formatDate(dataObj) {
        const y  = dataObj.getFullYear();
        const m  = ('0' + (dataObj.getMonth() + 1)).slice(-2);
        const d  = ('0' + dataObj.getDate()).slice(-2);
        const h  = ('0' + dataObj.getHours()).slice(-2);
        const mm = ('0' + dataObj.getMinutes()).slice(-2);
        const date = `${y}/${m}/${d}`;
        const time = `${h}:${mm}`;
        const chain =  `${y}${m}${d}${h}${mm}`
        const result = {date,time,chain}
        return result;
      }
      let repalceEmptySpace = '       ';
      const timeObj = formatDate(new Date());
      let filePath = `${makeFilePath}/${timeObj.chain}.txt`;
      let append = {
        flags:'a',
      }
      let writer = fs.createWriteStream(filePath,append);
      let erorrTitle =
      `${goyoAppDefaults.DIALOG_TITLE}　御用達15～18データ読み込みエラーログ  ${timeObj.date} ${timeObj.time}\r\n`
      +`エラー数：${repalceEmptySpace}\r\n\r\n`
      writer.write(erorrTitle);
      let title =
      `${goyoAppDefaults.DIALOG_TITLE}　御用達15～18データ読み込みエラーログ  ${timeObj.date} ${timeObj.time}\r\n`
      +`エラー数：`
      writer.on('finish',()=>{
        let appendErrologCount = {
          flags:'r+',
          start:0,
        };
        let reWriter = fs.createWriteStream(filePath,appendErrologCount);
        reWriter.setDefaultEncoding('utf8');
        reWriter.write(title + counter.total);
        reWriter.end();
      })
      return {writer,errorLogFilePath:filePath};
    },
    createCustomWriter(errorCounter,writerStream){
      const lv1Brank = '';
      const lv2Brank = '  ';
      const lv3Brank = '    ';
      let isWriteTitle = false;
      let albumId = undefined;
      let writer = function(obj){
        try {
          let errorContet = '';
          errorCounter.total++;
          if(!isWriteTitle){
            errorCounter.construction++;
            var no = ( '000' + errorCounter.construction ).slice(-4);
            errorContet += lv1Brank + '■No.' + no + '　';
            errorContet += '工事名:' + obj.failedConstruction + '\r\n';
            errorContet += obj.failedConstructionPath + '\r\n\r\n';
            isWriteTitle = true;
          }
          if(obj.failedItem.albumName){
            if(albumId != obj.failedItem.albumId){
              errorContet += lv2Brank + 'アルバム名:' + obj.failedItem.albumName + '\r\n';
              errorContet += lv2Brank + 'データフォルダ:' + obj.failedItem.albumPath + '\r\n';
              albumId = obj.failedItem.albumId;
          }
            errorContet += lv3Brank + 'フレーム:' + obj.failedItem.name + lv3Brank;
          }else{
            errorContet += lv2Brank + obj.failedItem.name + lv3Brank;
          }
          errorContet += 'メッセージ:' + obj.failedMessage + '\r\n';
          if(albumId != obj.failedItem.albumId){
            errorContet += '\r\n';
          }
          writerStream.write(errorContet);
        } catch (e) {
          console.log("​}catch -> e", e)
        }
      }
      return writer;
    },
  }
  function btnProcessEnd(btnElement){
    console.log('is end');
    delete document.busy;
    addSelected(btnElement);
    $('#list tr td').removeClass('border-orange-left-top-bottom border-orange-top-bottom border-orange-right-top-bottom');
  }
  async function showTrialDialogIfConsMakeMax(migrationIdList = [],windowObjet){
    const constructionCount = currentData.constructions.length;
    const migratateCount = migrationIdList.length;
    if(constructionCount + migratateCount > goyoAppDefaults.TRIAL_MAX_CONSTRUCTIONS){
      await goyoDialog.showLicenseRestrictionDialog(windowObjet,7);
      return true;
    }
    return false;
  }
})();
