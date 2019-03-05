let gCtx;
const isNetworkConstruction = ()=> checkNetworkConstruction.isNetworkConstruction();
(async function(){//check network construction
  let params = (new URL(document.location)).searchParams;
  let constructionId = parseInt(params.get('constructionId'));
  await checkNetworkConstructionInit(constructionId);
  windowEffecter.initialize();
  windowEffecter.showLoadingWindowIfTrueCallback(isNetworkConstruction);
})();
(function () {
  'use strict';

  // Node.js modules.
  const path = require('path');
  const fs = require('fs');
  const fse = require('fs-extra');

  // Electron modules.
  const electron = require('electron');
  const { remote } = require('electron');
  const escape = require('escape-html');

  // Goyo modules.
  const { viewMode, BookrackViewWindowSet, AlbumWindowSet } =
    remote.require('./lib/goyo-window-controller');
  const goyoDialog = remote.require('./lib/goyo-dialog-utils');
  const goyoWebInfo = remote.require('./lib/goyo-web-information');
  const albumOperation = remote.require('./lib/goyo-album-operation');
  const settingsOperation = remote.require('./lib/goyo-settings-operation');
  const programSettings = remote.require('./lib/goyo-program-settings');
  const printOperation = remote.require('./lib/print-operation');
  const { htmlOpener, holdWindowsStop } = remote.require('./lib/goyo-utils');
  const goyoMenu = remote.require('./lib/menus/goyo-menu');
  const menuActions = remote.require('./lib/menus/goyo-menu-actions');
  const MENU_TYPE = remote.require('./lib/menus/goyo-menu-type');
  const windowHandler = remote.require('./lib/window-controller/window-handler');
  const goyoAppDefaults = remote.require('./lib/goyo-app-defaults');
  const kuraemonConnect = remote.require('./lib/connect-if/kuraemon-connect');
  const constructionOperation =
    remote.require('./lib/goyo-construction-operation');
  //const logger = remote.require('./lib/goyo-log')('bookrack_window');
  const uiParam = remote.require('./lib/goyo-ui-parameters');
  const { customSchema } = remote.require('./lib/goyo-image-protocol-handler');
  var bookrackAccessor = remote.require('goyo-bookrack-accessor');
  const getLicense = remote.require('./lib/license/goyo-license-manager');
  const lockFactory = remote.require('./lib/lock-manager/goyo-lock-manager');
  const licenseManager = remote.require('./lib/license/goyo-license-manager');
  const PRECISION = 2;

  let ctx = {
    constructionId: null,
    bookrackId: null,
    knackType: null,
    bookrackViewWindowSet: null,
    albums: null,
    boxes: null,
    selectedItem: null,
    bookrackItems: null,
    bookrackCount: null,
    albumInformation: null,
    isSharedFolder:false,
    dataFolder:null
  };

  gCtx = ctx;
  var isMouseDown = false;
  var cursorPos = {
    oldPosX: null,
    oldPosY: null,
    isMouseDown: false,
    isMenuIcon: false,
    setIsMenuIcon: function (isMenuIcon) {
      this.isMenuIcon = isMenuIcon;
    },
    getIsMenuIcon: function () {
      return this.isMenuIcon;
    },
    setMouseDown: function (isDown) {
      this.isMouseDown = isDown;
    },
    getMouseDown: function () {
      return this.isMouseDown;
    },
    setCurrsorAppPos: function (x, y) {
      this.oldPosX = x;
      this.oldPosY = y;
    },
    getCurrsorAppPos: function (x, y) {
      let pos = { 'x': this.oldPosX, 'y': this.oldPosY };
      return pos;
    }
  }
  var storeWindowSize = {
    width: -1,
    height: -1
  }

  HTMLElement.prototype.pseudoStyle = function (className, element, prop, value) {
    console.log(className)
    console.log(value)
    let sheetId = 'pseudoStyles';
    let head = document.head || document.getElementsByTagName('head')[0];
    let sheet = document.querySelector('#' + sheetId);
    let classNames = this.className.split(' ');
    if (classNames.indexOf(className) === -1) {
      this.className += ' ' + className;
    }
    if (sheet == undefined) {
      sheet = document.getElementById(sheetId) || document.createElement('style');
      sheet.id = sheetId;
      head.appendChild(sheet);
    }
    sheet.innerHTML = escape(` .${className}:${element}{${prop}:${value}}`);

    return this;
  };

  function path2Url(p, suppressCache, schema = 'file') {
    let suffix = (suppressCache) ? `?_=${Date.now()}` : '';
    let filePath = encodeURI(p.replace(/\\/g, '/'));
    filePath = filePath.replace(/\#/g, '\%23');
    return schema + `:///${filePath}${suffix}`;
  }

  function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }

  async function initialize(construction) {
    logger.trace('initialize(): begin');

    ctx.constructionId = parseInt(construction.constructionId);
    ctx.bookrackId = parseInt(construction.bookrackId);
    ctx.knackType = construction.knackType;
    ctx.bookrackViewWindowSet =
      BookrackViewWindowSet.get(construction.constructionId);
    ctx.isSharedFolder = construction.isSharedFolder;
    ctx.dataFolder = construction.dataFolder;
    document.querySelector('.construction_name').textContent =
      construction.constructionName;
    document.querySelector('.knack_name').textContent =
      `【${construction.knackName}】`;
    document.title = goyoAppDefaults.PRODUCT_NAME+" "+getLicense.licenseType+" - "+construction.constructionName;

    logger.trace('initialize(): icon setting');
    removeIconDeliverable();
    let elemKnackName = document.querySelector('.knack_name');
    let knackNameWidth = window.getComputedStyle(elemKnackName, null).getPropertyValue('width');
    document.querySelector('.construction_name').style.width = `calc(100% - ${(parseInt(knackNameWidth) + 25)}px)`;

    await initializeAlbum();
    selectFirstBookrackItem();
    rightClickSetting();
    initializeSettingOperations();

    initializePaginationControl();
    storeWindowSize.width = remote.getCurrentWindow().getSize()[0];
    storeWindowSize.height = remote.getCurrentWindow().getSize()[1];
    window.addEventListener('resize', async function () {
      let targetdiv = document.querySelector('#album_spine_list');
      updateWidth(targetdiv);
    });
    logger.trace('initialize(): end');
  }

  function initializePaginationControl() {
    logger.trace('initializePaginationControl(): begin');
    document.pageControl = { indexAlbum: 0 };

    // 仕切り、BOXによる表示位置の修正
    let trayBoxFirstChildAddLeft = ((elem)=>{
      let prevElem = elem.previousElementSibling;
      // 仕切り
      if(prevElem.classList.contains('album-tray-left') === true){
        return prevElem.getBoundingClientRect().width;
      // BOX
      }else if(prevElem.classList.contains('album-box-border') === true){
        let parentLeftElem = prevElem.parentNode.previousElementSibling;
        // さらに横が仕切り
        if(parentLeftElem.classList.contains('album-tray-left')){
          return prevElem.getBoundingClientRect().width+parentLeftElem.getBoundingClientRect().width;
        }else{
          return prevElem.getBoundingClientRect().width;
        }
      }
      return 0;
    });

    // Event when click next
    let nextControl = document.querySelector('.comcomment > .right-book');
    nextControl.onclick = function () {
      if (document.pageControl.indexAlbum < ctx.albums.length) {
        let scrollableElements = $('.scrollable'),
          i = scrollableElements.index($('.scrolled'));
        let next = scrollableElements.eq(i + 1);
        if (selectedAlbums.length === 1 && scrollableElements.eq(i)[0].data.id === selectedAlbums[0].data.id) {
          removeSelectedMark(scrollableElements.eq(i)[0]);
          selectedAlbums[0] = next[0];
          addSelectedMark(next[0]);
          next[0].onmouseover();
        }
        let childPos = next[0].getBoundingClientRect();
        let parPos =
          document.querySelector('.bookrack-scroller').getBoundingClientRect();
        document.querySelector('.bookrack-scroller').style.left =
          (parPos.left - childPos.left + trayBoxFirstChildAddLeft(next[0])) + 'px';
        document.querySelector('.scrolled') && document.querySelector('.scrolled').classList.remove('scrolled');
        next[0].classList.add('scrolled');
        document.pageControl.indexAlbum++;
        updatePaginationControl();
      }
    };

    // Event when click previous
    let prevControl = document.querySelector('.comcomment > .left-book');
    prevControl.onclick = function () {
      if (document.pageControl.indexAlbum > 0) {
        let scrollableElements = $('.scrollable'),
          i = scrollableElements.index($('.scrolled'));
        if (i > 1) {
          let prev = scrollableElements.eq(i - 1);
          let childPos = prev[0].getBoundingClientRect();
          let parPos = document.querySelector('.bookrack-scroller')
            .getBoundingClientRect();
          document.querySelector('.bookrack-scroller').style.left =
            (parPos.left - childPos.left + trayBoxFirstChildAddLeft(prev[0])) + 'px';
          document.querySelector('.scrolled').classList.remove('scrolled');
          prev[0].classList.add('scrolled');
          document.pageControl.indexAlbum--;
        } else {
          document.querySelector('.scrolled') && document.querySelector('.scrolled').classList.remove('scrolled');
          scrollableElements.eq(0)[0].classList.add('scrolled');
          document.querySelector('.bookrack-scroller').style.left = '0px';
          document.pageControl.indexAlbum = 0;
        }
        let bookrackInnerPos = document.querySelector('#bookrack_inner').getBoundingClientRect();
        let leftOuterWidth = document.querySelector('.left-outer').getBoundingClientRect().width;
        if (selectedAlbums.length === 1
          && bookrackInnerPos.width + leftOuterWidth - selectedAlbums[0].getBoundingClientRect().left < selectedAlbums[0].getBoundingClientRect().width * 0.8) {
          for (let index = 0; index < scrollableElements.length; index++) {
            let element = scrollableElements[index];
            if (bookrackInnerPos.width + leftOuterWidth - element.getBoundingClientRect().left < element.getBoundingClientRect().width * 0.8) {
              removeSelectedMark(selectedAlbums[0]);
              selectedAlbums[0] = scrollableElements[index - 1];
              addSelectedMark(scrollableElements[index - 1]);
              scrollableElements[index - 1].onmouseover();
              break;
            }
          }
        }
        updatePaginationControl();
      }
    };
    logger.trace('initializePaginationControl(): end');
  }

  async function drawBookrackItems(bookrackItems, parentElem, indexAlbum) {
    if (!indexAlbum) {
      indexAlbum = 0;
    }
    if (bookrackItems) {
      if (ctx.bookrackCount == null) {
        ctx.bookrackCount = 0;
      }
      let i = 0;
      let checkErrLoadAlbum = false;
      while (i < bookrackItems.length) {
        let currentItem = bookrackItems[i];
        let currentElem;
        try{
          switch (currentItem.bookrackItemType) {
            case 0:
              currentElem = parentElem;
              currentElem.setAttribute('data-id', currentItem.bookrackItemId);
              currentElem.setAttribute(
                'parent-id', currentItem.parentBookrackItemId);
              currentElem.setAttribute('g-index', ctx.bookrackCount);
              ctx.bookrackCount++;
              indexAlbum = await drawBookrackItems(currentItem.bookrackItems, currentElem, indexAlbum);
              break;
            case 1:
              const trayPlaceHolder = document.createElement('div');
              parentElem.appendChild(trayPlaceHolder);
              currentElem = document.createElement('div');
              currentElem.classList.add('album-tray');
              currentElem.classList.add('drawing-child-nodes');
              currentElem.classList.add('bookrack-item');
              currentElem.setAttribute('data-id', currentItem.bookrackItemId);
              currentElem.setAttribute(
                'parent-id', currentItem.parentBookrackItemId);
              currentElem.setAttribute('g-index', ctx.bookrackCount);
              ctx.bookrackCount++;
              indexAlbum = await drawBookrackItems(currentItem.bookrackItems, currentElem, indexAlbum);
              drawTrayBorders(currentElem, currentItem.bookrackItemName);
              parentElem.replaceChild(currentElem, trayPlaceHolder);
              currentElem.data = { id: currentItem.bookrackItemId };
              updateAlbumWidth(currentElem);
              updateBoxWidth(currentElem);
              break;
            case 2:
              const boxPlaceHolder = document.createElement('div');
              parentElem.appendChild(boxPlaceHolder);
              currentItem.albumCount = currentItem.bookrackItems.length;
              currentItem.indexOfFirstAlbum = indexAlbum;
              //let albumInBoxDetail = await bookrackAccessor.getAlbumDetail(
                //ctx.constructionId, ctx.albums[indexAlbum].bookrackItemId);
              //ctx.albums[indexAlbum].albumDetail = albumInBoxDetail.albumDetail;
              currentElem = await createBoxElement(currentItem);
              currentElem.classList.add('bookrack-item');
              currentElem.setAttribute('data-id', currentItem.bookrackItemId);
              currentElem.setAttribute(
                'parent-id', currentItem.parentBookrackItemId);
              currentElem.setAttribute('g-index', ctx.bookrackCount);
              ctx.bookrackCount += currentItem.bookrackItems.length + 1;
              currentElem.data = {
                id: currentItem.bookrackItemId,
                name: currentItem.bookrackItemName,
                albumCount: currentItem.albumCount,
                colorType: currentItem.colorType,
                bookrackItems: currentItem.bookrackItems,
                indexOfFirstAlbum: currentItem.indexOfFirstAlbum,
                children: getChildrenBookrack(
                  currentItem.bookrackItemId, currentItem.bookrackItems)
              };
              indexAlbum += currentItem.albumCount;
              parentElem.replaceChild(currentElem, boxPlaceHolder);
              currentElem.isConnected && updateBoxWidth(currentElem);
              break;
            case 3:
              const spinePlaceHolder = document.createElement('div');
              parentElem.appendChild(spinePlaceHolder);
              //let albumDetail = await bookrackAccessor.getAlbumDetail(
              //    ctx.constructionId, currentItem.bookrackItemId);
              let albumDetail = await ctx.albums[indexAlbum].albumDetailPromise;
              let pathSpineCover = albumDetail.spineCover;
              if(!fs.existsSync(pathSpineCover)){
                console.log('path is not exist: '+pathSpineCover);
                checkErrLoadAlbum = true;
                break;
              }
              currentItem.albumDetail = albumDetail;
              //ctx.albums[indexAlbum].albumDetail = albumDetail.albumDetail;
              currentElem = await createAlbumSpineElement(currentItem, 0, indexAlbum);
              currentElem.classList.add('bookrack-item');
              currentElem.setAttribute('data-id', currentItem.bookrackItemId);
              currentElem.setAttribute(
                'parent-id', currentItem.parentBookrackItemId);
              currentElem.setAttribute('g-index', ctx.bookrackCount);
              ctx.bookrackCount++;
              indexAlbum ++;
              parentElem.replaceChild(currentElem, spinePlaceHolder);
              currentElem.data.id = currentItem.bookrackItemId;
              currentElem.isConnected && updateAlbumWidth(currentElem);
              break;
          }
        }catch(e){
          checkErrLoadAlbum = true;
          logger.error('loading album', e);
        }finally{
          i++;
        }
      }
      parentElem.classList.remove('drawing-child-nodes');
      if(checkErrLoadAlbum){
        await goyoDialog.showErrorMessageDialog(remote.getCurrentWindow(), 'エラー',
          '正常に読み込めないアルバムがあります。', 'OK');
      }
    }
    return indexAlbum;
  }

  function getChildrenBookrack(bookrackItemId, bookrackItems) {
    let data = [];
    bookrackItems.forEach((element) => {
      data.push({ bookrackItemId: element.bookrackItemId });
    });
    return data;
  }

  function drawTrayBorders(trayElem, title) {
    const drawInterval = setInterval(() => {
      if (!trayElem.classList.contains('drawing-child-nodes')) {
        const borderLeft = document.createElement('div');
        borderLeft.classList.add('album-tray-left');
        const trayTitle = document.createElement('div');
        trayTitle.classList.add('tray-title');
        trayTitle.innerText = title;
        borderLeft.insertBefore(trayTitle, borderLeft.childNodes[0]);
        trayElem.insertBefore(borderLeft, trayElem.childNodes[0]);
        const borderRight = document.createElement('div');
        borderRight.classList.add('album-tray-right');
        trayElem.appendChild(borderRight);
        const borderBottom = document.createElement('div');
        borderBottom.classList.add('album-tray-bottom');
        trayElem.appendChild(borderBottom);

        // Context menu setting for album box.
        trayElem.addEventListener('contextmenu', compartmentRightclickHandler);
        Array.from(trayElem.querySelectorAll('.album-tray-bottom, .album-tray-left, .album-tray-right'))
          .forEach((trayPart) => {
            trayPart.addEventListener('mouseenter', (evt) => {
              const hoveredElem = document.querySelector('.mouse-hover-element');
              hoveredElem && hoveredElem.classList.remove('mouse-hover-element');
              trayElem.classList.add('mouse-hover-element');
              trayElem.addEventListener(
                'space-keydown', compartmentRightclickHandler);
            });
            trayPart.addEventListener('mouseleave', (evt) => {
              trayElem.classList.remove('mouse-hover-element');
              trayElem.removeEventListener(
                'space-keydown', compartmentRightclickHandler);
            });
          });
        clearInterval(drawInterval);
      }
    }, 1);
  }

  async function compartmentRightclickHandler(e) {
    if (!this.classList.contains('mouse-hover-element')) return;
    if (this.querySelector('.shadow') && this.querySelector('.shadow').style.width === '100%' && e.target.className === 'shadow') return;
    e.stopPropagation();

    ctx.selectedItem = this;

    let coordinates = [];
    let coordinate = getWritableCoordinate(e.currentTarget);
    coordinates.push(coordinate);

    let target = new menuActions.ActionTarget({
      constructionId: ctx.constructionId,
      bookrackId: ctx.bookrackId,
      compartmentId: this.data.id,
    });

    try {
      let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
        mainTargetName: this.data.name,
        menuType: MENU_TYPE.COMPARTMENT,
        highlightAreas: coordinates
      });
      if (actionId) {
        const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target)
        sharedCheckThenRun(menuActionFunc);
      }
    } catch (e) {
      console.log('error', e);
    }
  }

  async function initializeAlbum() {
    logger.trace('initializeAlbum(): begin');
    try {
      console.timeStamp('initializeAlbum(): begin');
      disableUserActions();
      let { bookrackItems } =
        await bookrackAccessor.getBookrackItems(ctx.constructionId);
      bookrackItems = JSON.parse(JSON.stringify(bookrackItems));
      displayBackupButton(bookrackItems);
      ctx.bookrackItems = bookrackItems;
      let bookrackData =
        ctx.bookrackItems.find(u => u.bookrackItemId === ctx.bookrackId) ||
        ctx.bookrackItems[0];
      console.timeStamp('initializeAlbum(): before getAlbumFromBookrackItem');
      ctx.albums = getAlbumFromBookrackItem(bookrackData);
      console.timeStamp('initializeAlbum(): before ensureLoadingAlbumDetails');
      ensureLoadingAlbumDetails(ctx.albums);
      console.timeStamp('initializeAlbum(): before getBoxFromBookrackItem');
      ctx.boxes = getBoxFromBookrackItem(bookrackData);
      document.querySelector('.bookrack-item-name').textContent =
        bookrackData.bookrackItemName;
      console.timeStamp('initializeAlbum(): before drawBookrackItems');
      await drawBookrackItems(
        bookrackData.bookrackItems,
        document.querySelector('#album_spine_list'));
      console.timeStamp('initializeAlbum(): before enableUserActions');
      enableUserActions();
      document.querySelector('#album_spine_list').data = { id: ctx.bookrackId };
      let targetdiv = document.querySelector('#album_spine_list');
      let scrollables = targetdiv.querySelectorAll('.album_spine, .album_box');
      if (scrollables.length > 0) {
        scrollables[0].classList.add('scrolled');
      }
      for (let scrollable of scrollables) {
        scrollable.classList.add('scrollable');
      }
      console.timeStamp('initializeAlbum(): before updateOtherWidth');
      updateOtherWidth(targetdiv);
      eventSetting();
      console.timeStamp('initializeAlbum(): end');
      $('#bookrack_inner img').attr('draggable', 'false');
    } catch (e) {
      logger.error('initializeAlbum', e);
    }
    logger.trace('initializeAlbum(): end');
  }

  function ensureLoadingAlbumDetails(albumItems, force=false) {
    for (let albumItem of albumItems) {
      if (albumItem.albumDetailPromise == null || force) {
        console.timeStamp(`getAlbumDetail - ${albumItem.bookrackItemId} begin`);
        albumItem.albumDetailPromise =
          albumOperation.getAlbumDetail(ctx.constructionId, albumItem.bookrackItemId)
          .then(r => {
            //let ad = r.albumDetail;
            //ad = JSON.parse(JSON.stringify(ad));
            //return ad;
            albumItem.albumDetail = JSON.parse(r);
            console.timeStamp(`getAlbumDetail - ${albumItem.bookrackItemId} end`);
            return albumItem.albumDetail;
          });
          //.catch(e => { logger.error('loadAlbums', e);  return makeDummy(albumItem); });
      }
    }

    function makeDummy(albumItem) {
      return {
        albumId: albumItem.bookrackItemId,
        albumSettings: albumOperation.defaultAlbumSettings,
        albumType: 0,
        spineCover: '',
        frameTotalCount: 0,
        layout: { albumTemplate: '' },
      };
    }
  }

  function enableUserActions() {
    document.querySelector('div#loading-overlay').style.display = 'none';
  }

  function disableUserActions() {
    document.querySelector('div#loading-overlay').style.display = 'block';
  }

  function displayBackupButton(bookrackItems) {
    let findAlbum = (items) => {
      for (let item of items) {
        if (item.bookrackItemType === 3) {
          return true;
        } else if (findAlbum(item.bookrackItems)) {
          return true;
        }
      }
      return false;
    };
    if (findAlbum(bookrackItems)) {
      $('#backup-button').show();
      return;
    }
    $('#backup-button').hide();
  }

  function getAlbumFromBookrackItem(bookrackItem, result) {
    if (result == undefined) result = [];
    if (bookrackItem.bookrackItemType === 2) {
      bookrackItem.bookrackItems &&
        bookrackItem.bookrackItems.forEach(element => {
          element.boxId = bookrackItem.bookrackItemId;
          getAlbumFromBookrackItem(element, result);
        });
      return result;
    }
    if (bookrackItem.bookrackItemType === 3) {
      result.push(bookrackItem);
    }
    if (bookrackItem.bookrackItems) {
      bookrackItem.bookrackItems.forEach(element => {
        getAlbumFromBookrackItem(element, result);
      });
    }
    return result;
  }

  function getBoxFromBookrackItem(bookrackItem, result) {
    if (result == undefined) result = [];
    if (bookrackItem.bookrackItemType === 2) {
      bookrackItem.albumCount = bookrackItem.bookrackItems.length;
      result.push(bookrackItem);
      bookrackItem.bookrackItems.forEach(element => {
        element.boxId = bookrackItem.bookrackItemId;
        getBoxFromBookrackItem(element, result);
      });
    }
    if (bookrackItem.bookrackItems) {
      bookrackItem.bookrackItems.forEach(element => {
        getBoxFromBookrackItem(element, result);
      });
    }

    return result;
  }

  function updateWidth(parentEl) {
    // update width of box
    updateBoxWidth(parentEl);
    // update width of album
    updateAlbumWidth(parentEl);
    // update boxExpandElements
    updateBoxExpandWidth(parentEl);

    updateOtherWidth(parentEl);
  }

  function updateOtherWidth(parentEl) {
    // update tablet width
    let tabletEl = document.querySelector('#tablet');
    let tabletHeight =
      window.getComputedStyle(tabletEl).getPropertyValue('height');
    tabletEl.style.width = (parseFloat(tabletHeight) * 258 / 898) + 'px';

    // update width of scroller panel
    let bookrackScrollerEl = document.querySelector('.bookrack-scroller');
    let albumSpineListWidth =
      window.getComputedStyle(parentEl).getPropertyValue('width');
    let bookendWidth = window.getComputedStyle(document.querySelector('#bookend'))
      .getPropertyValue('width');
    let scrollerPanelWidth =
      (parseFloat(albumSpineListWidth) + parseFloat(bookendWidth));
    bookrackScrollerEl.style.width = scrollerPanelWidth + 'px';
    let innerWidth = parseFloat(
      window.getComputedStyle(document.querySelector('#bookrack_inner'))
        .getPropertyValue('width'));
    let spineWidth = parseFloat(
      window.getComputedStyle(document.querySelector('#album_spine_list'))
        .getPropertyValue('width'));
    let endWidth =
      parseFloat(window.getComputedStyle(document.querySelector('#bookend'))
        .getPropertyValue('width'));

    let spaceWidth = Math.abs(
      parseFloat(innerWidth) - parseFloat(endWidth) - parseFloat(spineWidth));
    document.querySelector('#bookrack-space').style.width = spaceWidth + 'px';
    document.querySelector('#bookrack-space').style.fontSize =
      spaceWidth * 3 + 'px';

    // update pagination
    let collection = $('.scrollable'), i = collection.index($('.scrolled'));
    if (i !== 0) {
      let scrolled = document.querySelector('.scrolled');
      if (scrolled) {
        let scrolledPos = scrolled.getBoundingClientRect();
        let parPos =
          document.querySelector('.bookrack-scroller').getBoundingClientRect();
        document.querySelector('.bookrack-scroller').style.left =
          (parPos.left - scrolledPos.left) + 'px';
      }
    } else {
      document.querySelector('.bookrack-scroller').style.left = '0px';
    }

    updatePaginationControl();
  }

  function updateBoxWidth(parentEl) {
    let boxWidth;
    let bookrackHeight = document.querySelector('#album_spine_list').offsetHeight;
    let albumBoxElements = parentEl.querySelectorAll('.album_box');
    if (albumBoxElements.length === 0 && parentEl.className.indexOf('album_box') > -1 && parentEl.className.indexOf('album_box_expanded') === -1) {
      albumBoxElements = [parentEl];
    }
    albumBoxElements.forEach(albumBoxElement => {
      if (boxWidth == undefined) {
        boxWidth = precisionRound(170 / 600 * bookrackHeight, PRECISION);
      }
      albumBoxElement.style.width = boxWidth + 'px';
      const boxNameEl = albumBoxElement.querySelector('.comtext2');
      boxNameEl.style.width = 'fit-content';
      const boxNameWidth = parseInt(window.getComputedStyle(boxNameEl, null).getPropertyValue('width'));
      boxNameEl.style.width = ` ${boxNameWidth + parseInt(boxNameEl.style.fontSize) / 4}px`;
      boxNameEl.style.left = `calc(50% - ${boxNameWidth / 2}px)`;
      setTimeout(() => {
        calculateDot(boxNameEl.parentElement);
      }, 0);
    });
    ctx.boxes.forEach(box => {
      box.width = boxWidth;
    });
  }

  function updateAlbumWidth(parentEl) {
    let borderWidth;
    let bookrackHeight = document.querySelector('#album_spine_list').offsetHeight;
    let albumBorderElements = parentEl.querySelectorAll('.album-box-border');
    if (albumBorderElements.length === 0 && parentEl.className.indexOf('album-box-border') > -1) {
      albumBorderElements = [parentEl];
    }
    albumBorderElements.forEach(albumBorderElement => {
      if (borderWidth == undefined) {
        borderWidth = precisionRound(12 / 600 * bookrackHeight, PRECISION);
      }
      albumBorderElement.style.width = borderWidth + 'px';
    });

    // update width of album
    if (borderWidth == undefined) {
      borderWidth = 0;
    }
    // standard size when bookrack height = 452
    const sizes = [
      { frameCount: 6, width: 42 }, { frameCount: 18, width: 45 },
      { frameCount: 24, width: 47 }, { frameCount: 33, width: 50 },
      { frameCount: 54, width: 53 }, { frameCount: 39, width: 58 },
      { frameCount: 102, width: 61 }, { frameCount: 136, width: 65 },
      { frameCount: 150, width: 67 }, { frameCount: 213, width: 73 },
      { frameCount: 300, width: 77 }, { frameCount: 375, width: 82 },
      { frameCount: 480, width: 84 }, { frameCount: 540, width: 85 },
      { frameCount: 900, width: 90 }, { frameCount: 1008, width: 91 },
      { frameCount: 1494, width: 94 }, { frameCount: 1506, width: 94 },
      { frameCount: 1902, width: 96 }, { frameCount: 2502, width: 97 },
      { frameCount: 3000, width: 98 },
    ];
    const minAlbumWidth = precisionRound(bookrackHeight * 42 / 452, PRECISION);
    let albumSpineElements = parentEl.querySelectorAll('.album_spine');
    if (albumSpineElements.length === 0 && parentEl.className.indexOf('album_spine') > -1) {
      albumSpineElements = [parentEl];
    }
    albumSpineElements.forEach(albumSpineElement => {
      let albumWidth = minAlbumWidth;
      let album = ctx.albums[albumSpineElement.data.indexInConstruction];
      // Change thickness of album when thicknessByPage = 1
      if (!album) return;
      if (album.albumDetail.albumSettings && album.albumDetail.albumSettings.bookCoverOption) {
        if (album.albumDetail.albumSettings.bookCoverOption.thicknessByPage === 1) {
          let size = {};
          if(album.albumDetail.frameTotalCount > 3000) {
            size.width = 100; 
          } else {
            size = sizes.find(u => u.frameCount >= album.albumDetail.frameTotalCount);
          }
          albumWidth = precisionRound(bookrackHeight * size.width / 452, PRECISION);
        } else {
          albumWidth = precisionRound(bookrackHeight * 60 / 452, PRECISION);
        }
      }
      albumSpineElement.style.width = albumWidth + 'px';
      albumWidth = albumWidth + albumSpineElement.data.firstOrLastAlbumInBox * borderWidth;
      album.width = albumWidth;
      const previewEl = albumSpineElement.querySelector('.preview');
      let rate = previewEl.naturalWidth / previewEl.naturalHeight;
      let matrix = window.getComputedStyle(previewEl, null).getPropertyValue("transform");
      if (previewEl.naturalWidth > previewEl.naturalHeight) {
        previewEl.style.width = minAlbumWidth + 'px';
        if (matrix !== 'none') {
          bookrackAccessor.getAlbumFrames(
            ctx.constructionId, album.albumDetail.albumId, 
            album.albumDetail.albumSettings.bookCoverOption.reducedImagePosition - 1, 1).then((albumFrames) => {
              let rotate = (albumFrames.albumFrames[0].textFrames.hasOwnProperty('goyo.photo.rotate') &&
                parseInt(albumFrames.albumFrames[0].textFrames['goyo.photo.rotate'].fieldValue)) || 0;
              if (rotate === 90 || rotate === 270) {
                let minAlbumHeight = minAlbumWidth / rate;
                previewEl.style.bottom = (minAlbumWidth - minAlbumHeight) * 0.5 + 10 + 'px';
              }
            }).catch(e => logger.error('albumSpineElements.forEach', e));
        }
      } else {
        previewEl.style.width = (minAlbumWidth * rate) + 'px';
        if (matrix !== 'none') {
          bookrackAccessor.getAlbumFrames(
            ctx.constructionId, album.albumDetail.albumId, 
            album.albumDetail.albumSettings.bookCoverOption.reducedImagePosition - 1, 1).then((albumFrames) => {
              let rotate = (albumFrames.albumFrames[0].textFrames.hasOwnProperty('goyo.photo.rotate') &&
                parseInt(albumFrames.albumFrames[0].textFrames['goyo.photo.rotate'].fieldValue)) || 0;
              if (rotate === 90 || rotate === 270) {
                previewEl.style.bottom = -((minAlbumWidth - minAlbumWidth * rate) * 0.5) + 10 + 'px';
              }
            }).catch(e => logger.error('albumSpineElements.forEach', e));
        }
      }
    });
    return borderWidth;
  }

  function updateBoxExpandWidth(parentEl) {
    let bookrackHeight = document.querySelector('#album_spine_list').offsetHeight;
    let borderWidth = precisionRound(12 / 600 * bookrackHeight, PRECISION);
    let albumBorderElements = parentEl.querySelectorAll('.album-box-border');
    if (albumBorderElements.length === 0 && parentEl.className.indexOf('album-box-border') > -1) {
      albumBorderElements = [parentEl];
    }
    albumBorderElements.forEach(albumBorderElement => {
      if (borderWidth == undefined) {
        borderWidth = precisionRound(12 / 600 * bookrackHeight, PRECISION);
      }
      albumBorderElement.style.width = borderWidth + 'px';
    });
    let footerElements = parentEl.querySelectorAll('.footer-album-box');
    if (footerElements.length === 0 && parentEl.className.indexOf('footer-album-box') > -1) {
      footerElements = [parentEl];
    }
    footerElements.forEach(footerElement => {
      footerElement.style.width = 'calc(100% - ' + ((borderWidth * 2) - 2) + 'px)';
      footerElement.style.left = borderWidth + 'px';
      footerElement.style.height = '17.0174%';
      const album = ctx.albums[footerElement.data.indexOfFirstAlbum];
      if (album.albumDetail.albumSettings.bookCoverOption.font) {
        if (album.albumDetail.albumSettings.bookCoverOption.font.fontName) {
          footerElement.querySelector('span').style.fontFamily =
            album.albumDetail.albumSettings.bookCoverOption.font.fontName;
        }
        if (album.albumDetail.albumSettings.bookCoverOption.font.fontColor) {
          footerElement.querySelector('span').style.color =
            album.albumDetail.albumSettings.bookCoverOption.font.fontColor;
        } else {
          footerElement.querySelector('span').style.color = 'black';
        }
        if (album.albumDetail.albumSettings.bookCoverOption.font.fontSize !=
          undefined) {
          let fontSize = cal(album.albumDetail.albumSettings.bookCoverOption.font.fontSize, 12, 20);
          footerElement.querySelector('span').style.fontSize = `${fontSize}px`;
        }
        if (album.albumDetail.albumSettings.bookCoverOption.font.fontWeight !=
          undefined) {
          footerElement.querySelector('span').style.fontWeight = `${
            album.albumDetail.albumSettings.bookCoverOption.font.fontWeight}`;
        }
        if (album.albumDetail.albumSettings.bookCoverOption.font.fontStyle !=
          undefined) {
          footerElement.querySelector('span').style.fontStyle =
            album.albumDetail.albumSettings.bookCoverOption.font.fontStyle;
        }
        if (album.albumDetail.albumSettings.bookCoverOption.font.textDecoration !=
          undefined &&
          album.albumDetail.albumSettings.bookCoverOption.font.textDecoration
            .trim() != '') {
          footerElement.querySelector('span').style.textDecoration =
            album.albumDetail.albumSettings.bookCoverOption.font.textDecoration
              .replace(/;/g, ' ');
        }
      }
      footerElement.style.backgroundSize = '100% 100%';
    });
    let footerBoxNames = parentEl.querySelectorAll('.footer-album-box span');
    if (footerBoxNames.length === 0 && parentEl.className.indexOf('footer-album-box span') > -1) {
      footerBoxNames = [parentEl];
    }
    footerBoxNames.forEach(footerBoxName => {
      let lines = Math.round(footerBoxName.offsetHeight / 16);
      $(footerBoxName)
        .css(
          'line-height',
          `${Math.round(footerBoxName.offsetHeight / lines)}px`);
      $(footerBoxName).css('-webkit-line-clamp', `${lines}`);
    });
  }

  function updatePaginationControl() {
    let bookrackScrollerEl = document.querySelector('.bookrack-scroller');
    let scrollerPanelLeft = parseFloat(
      bookrackScrollerEl.style.left === '' ? 0 : bookrackScrollerEl.style.left);
    let scrollerPanelWidth = parseFloat(
      bookrackScrollerEl.style.width === '' ? 0 :
        bookrackScrollerEl.style.width);
    let bookrackInnerWidth = parseFloat(
      window.getComputedStyle(document.querySelector('#bookrack_inner'))
        .getPropertyValue('width'));
    if (scrollerPanelWidth >= bookrackInnerWidth) {
      if (document.pageControl && document.pageControl.indexAlbum > 0) {
        document.querySelector('.left-book').style.display = '';
      } else {
        document.querySelector('.left-book').style.display = 'none';
      }
      if (scrollerPanelWidth + scrollerPanelLeft > bookrackInnerWidth) {
        document.querySelector('.right-book').style.display = '';
      } else {
        document.querySelector('.right-book').style.display = 'none';
      }
    } else {
      if (document.pageControl && document.pageControl.indexAlbum > 0) {
        document.querySelector('.left-book').style.display = '';
      } else {
        document.querySelector('.left-book').style.display = 'none';
      }
      document.querySelector('.right-book').style.display = 'none';
    }
  }

  function cal(fontSize, rangeMin, rangeMax) {
    let rangeMinTarget = 8;
    let rangeMaxTarget = 28;
    return (rangeMax - (rangeMaxTarget - fontSize) / (rangeMaxTarget - rangeMinTarget) * (rangeMax - rangeMin));
  }

  async function createBoxElement(box) {
    const boxHTML = `<div class="album_box scrollable">
        <img class="box-cover" src="../common/images/BOX/BOXBK/BOXBK_0${escape(box.colorType)}.png">
        <div class="comtext2">新しいBOX</div><div class="comtext2_1"><span style="font-size:20px;font-weight:bold;">1</span>冊</div>
        </div>`;
    let div = document.createElement('div');
    div.innerHTML = boxHTML;
    const boxNameEl = div.querySelector('.comtext2');
    if (box.bookrackItemName) {
      boxNameEl.innerText = "";
    }
    let characters = box.bookrackItemName.split('');
    for (const character of characters) {
      let characterElem = document.createElement('div');
      characterElem.innerText = character;
      boxNameEl.appendChild(characterElem);
    };
    
    let albumCountEl = div.querySelector('.comtext2_1');
    albumCountEl.querySelector('span').innerText = box.albumCount;
    const albumBoxElement = div.querySelector('.album_box');
    albumBoxElement.data = {
      id: box.bookrackItemId,
      name: box.bookrackItemName,
      albumCount: box.albumCount,
      colorType: box.colorType,
      indexOfFirstAlbum: box.indexOfFirstAlbum
    };
    // Find first album in box
    const album = ctx.albums[box.indexOfFirstAlbum];
    if (album) {
      let albumDetail = await album.albumDetailPromise;

      if (albumDetail.albumSettings && albumDetail.albumSettings.bookCoverOption) {
        // Load font for box name
        if (albumDetail.albumSettings.bookCoverOption.font) {
          if (albumDetail.albumSettings.bookCoverOption.font.fontName) {
            for (const characterElem of boxNameEl.children) {
              characterElem.style.fontFamily = albumDetail.albumSettings.bookCoverOption.font.fontName;
            };
            albumCountEl.style.fontFamily = albumDetail.albumSettings.bookCoverOption.font.fontName;
          }
          if (albumDetail.albumSettings.bookCoverOption.font.fontColor) {
            boxNameEl.style.color = albumDetail.albumSettings.bookCoverOption.font.fontColor;
            albumCountEl.style.color = albumDetail.albumSettings.bookCoverOption.font.fontColor;
          }
          if (albumDetail.albumSettings.bookCoverOption.font.fontSize != undefined) {
            let fontSize = cal(albumDetail.albumSettings.bookCoverOption.font.fontSize, 14, 40);
            boxNameEl.style.fontSize = `${fontSize}px`;
          }
          if (albumDetail.albumSettings.bookCoverOption.font.fontWeight != undefined) {
            boxNameEl.style.fontWeight = `${albumDetail.albumSettings.bookCoverOption.font.fontWeight}`;
            albumCountEl.style.fontWeight = `${albumDetail.albumSettings.bookCoverOption.font.fontWeight}`;
          }
          if (albumDetail.albumSettings.bookCoverOption.font.fontStyle != undefined) {
            if (albumDetail.albumSettings.bookCoverOption.font.fontStyle === 'italic'
              || albumDetail.albumSettings.bookCoverOption.font.fontStyle === 'oblique') {
              for (const characterElem of boxNameEl.children) {
                characterElem.style.transform = 'skew(0deg, 20deg)';
              };
            } else {
              boxNameEl.style.fontStyle = albumDetail.albumSettings.bookCoverOption.font.fontStyle;
            }
            albumCountEl.style.fontStyle = albumDetail.albumSettings.bookCoverOption.font.fontStyle;
          }
          if (albumDetail.albumSettings.bookCoverOption.font.textDecoration != undefined
            && albumDetail.albumSettings.bookCoverOption.font.textDecoration.trim() != '') {
            boxNameEl.style.textDecoration = albumDetail.albumSettings.bookCoverOption.font.textDecoration.replace(/;/g, ' ');
            albumCountEl.style.textDecoration = albumDetail.albumSettings.bookCoverOption.font.textDecoration.replace(/;/g, ' ');
          }
        }
        if (albumDetail.albumSettings.bookCoverOption.horizontalName === 1) {
          boxNameEl.style.writingMode = 'vertical-lr';
          boxNameEl.style.textOrientation = 'sideways';
        }
      }
    }

    // Event open box
    albumBoxElement.ondblclick = expandBox;
    // Event mouse over box
    albumBoxElement.onmouseover = function () {
      if (!document.movingItem) {
        setTextComcomtext(this.data.name, this.data.albumCount, this.data.id + '');
      }
    };

    // Context menu setting for album box.
    albumBoxElement.addEventListener('contextmenu', albumBoxRightclickHandler);
    albumBoxElement.addEventListener('mouseenter', (evt) => {
      const hoveredElem = document.querySelector('.mouse-hover-element');
      hoveredElem && hoveredElem.classList.remove('mouse-hover-element');
      albumBoxElement.classList.add('mouse-hover-element');
      albumBoxElement.addEventListener(
        'space-keydown', albumBoxRightclickHandler)
      });
    albumBoxElement.addEventListener('mouseleave', (evt) => {
      albumBoxElement.classList.remove('mouse-hover-element');
      albumBoxElement.removeEventListener(
        'space-keydown', albumBoxRightclickHandler);
    });
    async function albumBoxRightclickHandler(e) {
      if (!this.classList.contains('mouse-hover-element')) return;
      e.stopPropagation();

      if (selectedAlbums.length === 0 ||
        selectedAlbums.every(item => item.data.id !== this.data.id)) {
        // selectedAlbums.push(this);
      }

      let coordinates = [];
      let footerHeight = 0;
      if (document.querySelector('.footer-album-box')) {
        footerHeight = document.querySelector('.footer-album-box')
          .getBoundingClientRect()
          .height;
      }
      selectedAlbums.forEach((album) => {
        let coordinate = getWritableCoordinate(album);
        if (album.parentNode.className.includes('album_box_expanded')) {
          coordinate.height -= footerHeight;
        }
        coordinates.push(coordinate);
      });

      ctx.selectedItem = this;

      let target = new menuActions.ActionTarget({
        constructionId: ctx.constructionId,
        bookrackId: ctx.bookrackId,
        boxId:
          selectedAlbums.filter(item => !item.data.hasOwnProperty('albumName'))
            .map(box => box.data.id),
        albumId:
          selectedAlbums.filter(item => item.data.hasOwnProperty('albumName'))
            .map(album => album.data.id),
      });

      try {
        let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
          mainTargetName: this.data.name,
          menuType:
            (selectedAlbums.length > 1 ? MENU_TYPE.MULTI_ALBUM :
              MENU_TYPE.CLOSED_BOX),
          highlightAreas: coordinates
        });
        if (actionId) {
          const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
          sharedCheckThenRun(menuActionFunc);
        }
      } catch (e) {
        console.log('error', e);
      }
    }
    return div.children[0];
  }

  async function collapseBox() {
    logger.trace('collapseBox: begin');
    // get box in ctx.album
    const box = ctx.boxes.find(u => u.bookrackItemId === this.data.id);
    box.opened = false;
    const childAlbums = ctx.albums.filter(u => u.boxId === this.data.id);
    for (const album of this.parentNode.childNodes) {
      if (album.classList[0] === 'album_spine') {
        let bool =
          AlbumWindowSet.isOpened(ctx.constructionId, album.data.id);
        if (bool) {
          await goyoDialog.showWarningMessageDialog(
            remote.getCurrentWindow(), '注意',
            'このBOXの中のアルバムが開かれているため、BOXを閉じることができません。\n アルバムを閉じてからBOXを閉じてください。',
            'OK');
          logger.trace('collapseBox: end');
          return false;
        }
      }
    }
    childAlbums.forEach(album => {
      delete album.width;
    });
    let albumBoxExpandded = this.parentNode;

    let container = albumBoxExpandded.parentNode;
    let boxEl = await createBoxElement({
      bookrackItemName: this.data.name,
      albumCount: box.albumCount,
      bookrackItemId: this.data.id,
      colorType: box.colorType,
      indexOfFirstAlbum: this.data.indexOfFirstAlbum
    });

    if (albumBoxExpandded.querySelectorAll('.scrolled').length > 0) {
      boxEl.classList.add('scrolled');
    }
    albumBoxExpandded.querySelectorAll('.album_spine').forEach((albumSpine) => {
      if (selectedAlbums.includes(albumSpine)) {
        selectedAlbums.splice(selectedAlbums.indexOf(albumSpine), 1);
      }
    });
    clearSelectedAlbums(3);
    selectedAlbums = [boxEl];
    addSelectedMark(selectedAlbums[0]);
    boxEl.setAttribute('data-id', albumBoxExpandded.attributes['data-id'].value);
    boxEl.setAttribute(
      'parent-id', albumBoxExpandded.attributes['parent-id'].value);
    boxEl.setAttribute('g-index', albumBoxExpandded.attributes['g-index'].value);
    boxEl.data = albumBoxExpandded.data;
    $(boxEl).find('img').attr('draggable', 'false');

    container.insertBefore(boxEl, albumBoxExpandded.nextElementSibling);
    albumBoxExpandded.remove();
    updateBoxWidth(boxEl);
    boxCollapsedEventSetting(boxEl);

    logger.trace('collapseBox: end');
  }

  async function expandBox() {
    logger.trace('expandBox: start');
    // get box in ctx.album
    const box = ctx.boxes.find(u => u.bookrackItemId === this.data.id);
    box.opened = true;
    let df = document.createElement('div');
    df.className = 'album_box_expanded';
    df.classList.add('bookrack-item');
    df.setAttribute('data-id', this.attributes['data-id'].value);
    df.setAttribute('parent-id', this.attributes['parent-id'].value);
    df.setAttribute('g-index', this.attributes['g-index'].value);
    let bookrackItemIndex = parseInt(this.attributes['g-index'].value);
    df.data = this.data;

    // append left Border for Box
    let leftBorderElement = document.createElement('div');
    leftBorderElement.className = 'album-box-border';
    leftBorderElement.style.background = `url(../common/images/BOX/BOXSD/BOXSD_0${
      this.data.colorType}.png) 0% 0% / cover`;
    leftBorderElement.data = this.data;
    leftBorderElement.onmouseover = this.onmouseover;
    df.append(leftBorderElement);
    let firstAlbumInBox = true;
    if (ctx.albums.length > 0) {
      for (let indexAlbum = df.data.indexOfFirstAlbum; indexAlbum < df.data.indexOfFirstAlbum + df.data.albumCount; indexAlbum++) {
          indexAlbum = parseInt(indexAlbum);
          if (ctx.albums[indexAlbum].boxId === this.data.id) {
            let lastAlbumInBox = false;
            if (indexAlbum + 1 < ctx.albums.length &&
              ctx.albums[indexAlbum + 1].boxId !==
              ctx.albums[indexAlbum].boxId) {
              lastAlbumInBox = true;
            }
            if (!ctx.albums[indexAlbum].albumDetail) {
              await ctx.albums[indexAlbum].albumDetailPromise;
              //let albumDetail = await bookrackAccessor.getAlbumDetail(
              //ctx.constructionId, ctx.albums[indexAlbum].bookrackItemId);
              //ctx.albums[indexAlbum].albumDetail = albumDetail.albumDetail; 
            }
            let albumSpineElement = await createAlbumSpineElement(
              ctx.albums[indexAlbum],
              (firstAlbumInBox === true ? 1 : 0) +
              (lastAlbumInBox === true ? 1 : 0), indexAlbum);
            albumSpineElement.classList.add('bookrack-item');
            albumSpineElement.setAttribute(
              'data-id', ctx.albums[indexAlbum].bookrackItemId);
            albumSpineElement.setAttribute(
              'parent-id', ctx.albums[indexAlbum].parentBookrackItemId);
            albumSpineElement.setAttribute('g-index', ++bookrackItemIndex);
            df.append(albumSpineElement);

            if (selectedAlbums[0] && df.data.id === selectedAlbums[0].data.id && firstAlbumInBox) {
              clearSelectedAlbums(3);
              selectedAlbums = [albumSpineElement];
              addSelectedMark(albumSpineElement);
              firstAlbumInBox = false;
            } else if(selectedAlbums[0] === undefined && firstAlbumInBox) {
              selectedAlbums = [albumSpineElement];
              addSelectedMark(albumSpineElement);
              firstAlbumInBox = false;
            }
          }
      }
    }

    // append footer for Box
    let footerElement = document.createElement('div');
    footerElement.className = 'footer-album-box';
    footerElement.style.background = `url(../common/images/BOX/BOXFR/BOXFR_0${
      this.data.colorType}.png) repeat-x`;
    //footerElement.innerHTML = `<span>${this.data.name}</span>`;
    footerElement.innerHTML = '<span></span>'
    footerElement.children[0].textContent = this.data.name;
    footerElement.data = this.data;
    footerElement.onmouseover = this.onmouseover;
    footerElement.ondblclick = collapseBox;
    df.append(footerElement);

    // append right Border for Box
    let rightBorderElement = document.createElement('div');
    rightBorderElement.className = 'album-box-border';
    rightBorderElement.style.background =
      `url(../common/images/BOX/BOXSD/BOXSD_0${
      this.data.colorType}_2.png) 0% 0% / cover`;
    rightBorderElement.data = this.data;
    rightBorderElement.onmouseover = this.onmouseover;
    df.append(rightBorderElement);
    if (this.classList.contains('scrolled')) {
      df.querySelector('.album_spine').classList.add('scrolled');
    }
    this.parentNode && this.parentNode.insertBefore(df, this.nextElementSibling);
    this.remove();
    updateAlbumWidth(df);
    updateBoxExpandWidth(df);
    updateOtherWidth(document.querySelector('#album_spine_list'));
    boxExpandedEventSetting(df);
    footerRightClickSetting(footerElement);
    $(df).find('img').attr('draggable', 'false');

    logger.trace('expandBox: end');
    return df;
  }

  function waitLoadedVar(variable, func) {
    return new Promise((resolve, reject) => {
      if (!variable) {
        setTimeout(() => {
          waitLoadedVar(variable, func).then(resolve);
        }, 10);
      } else {
        func().then(resolve);
      }
    });
  }

  async function createAlbumSpineElement(album, firstOrLastAlbumInBox = 0, indexAlbum) {
    const albumDetail = await album.albumDetailPromise;
    const albumSpineHTML = `<div class="album_spine scrollable" data-id=${escape(albumDetail.albumId)}>
        <img class="spine-cover" draggable="false">
        <img class="star-icon" src="images/star.png">
        <div class="comtext">(unknown)</div>
        <img class="preview" src="" draggable="false">
        <div class="shadow" style="position:absolute;top:0;left:0;bottom:0;width:0;background:radial-gradient(#FFF, #999);opacity:0.9"></div>
        <img class="albumloading" src="../vendor/pixellab/loading.gif" draggable="false">
        </div>`;

    let div = document.createElement('div');
    div.innerHTML = albumSpineHTML;
    div.querySelector('img.spine-cover').src = albumDetail.spineCover.replace(/\\/g, '\\\\');
    const albumSpineElement = div.querySelector('.album_spine');
    albumSpineElement.data = {
      indexInConstruction: indexAlbum,
      totalAlbums: ctx.albums.length,
      opened: false,
      firstOrLastAlbumInBox: firstOrLastAlbumInBox
    };
    
    await prepareAlbumSpineElement(albumSpineElement, album);

    // Event open and close album
    let albumSpineClickFunc = async function (e) {
      if (e.ctrlKey || e.shiftKey || selectedAlbums.length > 1) {
        return;
      }

      if (AlbumWindowSet.isOpened(ctx.constructionId, this.data.id)) {
        AlbumWindowSet.close(ctx.constructionId, this.data.id);
        this.data.opened = false;
      } else {
        this.data.opened = false;
        let album = AlbumWindowSet.open(ctx.constructionId, this.data.id);
        album.once('failed', () => {
          this.data.opened = false;
          goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
        });
        if (checkNetworkConstruction.isNetworkConstruction()) {
          albumSpineElement.querySelector('img.albumloading').style = 'z-index:1000; display:block;';
        }
      }
    };
    albumSpineElement.onclick = albumSpineClickFunc;
    albumSpineElement.ondblclick = albumSpineClickFunc;

    // Event mouse hover album
    albumSpineElement.onmouseover = function () {
      if (!document.movingItem) {
        setTextComcomtext(this.data.albumName, this.data.frameTotalCount, this.data.indexInConstruction, ctx.albums.length);
      }
    };

    albumSpineElement.setState = function(state) {
      if (state === 'opened') {
        this.querySelector('.shadow').style.width = '100%';
      } else if (state === 'closed') {
        this.querySelector('.shadow').style.width = '0';
      } else {
      }
      this.querySelector('img.albumloading').style = '';
    };

    // Context menu setting for album.
    albumSpineElement.addEventListener(
      'contextmenu', albumSpineRightclickHandler);
    albumSpineElement.addEventListener('mouseenter', (evt) => {
      const hoveredElem = document.querySelector('.mouse-hover-element');
      hoveredElem && hoveredElem.classList.remove('mouse-hover-element');
      albumSpineElement.classList.add('mouse-hover-element');
      albumSpineElement.addEventListener(
        'space-keydown', albumSpineRightclickHandler)
    });
    albumSpineElement.addEventListener('mouseleave', (evt) => {
      albumSpineElement.classList.remove('mouse-hover-element');
      albumSpineElement.removeEventListener(
        'space-keydown', albumSpineRightclickHandler);
    });
    async function albumSpineRightclickHandler(e) {
      if (!this.classList.contains('mouse-hover-element')) return;
      if (this.querySelector('.shadow').style.width === '100%') return;
      e.stopPropagation();
      if (!selectedAlbums.length ||
        selectedAlbums.every(item => item.data.id !== this.data.id)) {
        // selectedAlbums.push(this);
      }

      let coordinates = [];
      let footerHeight = 0;
      if (document.querySelector('.footer-album-box')) {
        footerHeight = document.querySelector('.footer-album-box')
          .getBoundingClientRect()
          .height;
      }
      selectedAlbums.forEach((album) => {
        let coordinate = getWritableCoordinate(album);
        if (album.parentNode.className.includes('album_box_expanded')) {
          coordinate.height -= footerHeight;
        }
        coordinates.push(coordinate);
      });

      ctx.selectedItem = this;
      let target = new menuActions.ActionTarget({
        constructionId: ctx.constructionId,
        bookrackId: ctx.bookrackId,
        boxId:
          selectedAlbums.filter(item => !item.data.hasOwnProperty('albumName'))
            .map(box => box.data.id),
        albumId:
          selectedAlbums.filter(item => item.data.hasOwnProperty('albumName'))
            .map(album => album.data.id)
      });
      try {
        let menuType = (selectedAlbums.length > 1) ?
          MENU_TYPE.MULTI_ALBUM :
          (this.data.albumType === 2) ? MENU_TYPE.DELETED_ALBUM_SPINE :
            MENU_TYPE.ALBUM_SPINE;

        let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
          mainTargetName: this.data.albumName,
          menuType: menuType,
          highlightAreas: coordinates
        });
        if (actionId) {
          if (actionId === 'ALBUM:CHANGE-LAYOUT-ALL') {
            target.albumIds = ctx.albums.map(album => album.bookrackItemId);
          }
          const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
          sharedCheckThenRun(menuActionFunc);
        }
      } catch (e) {
        console.log('error', e);
      }
    }

    if (AlbumWindowSet.isOpened(ctx.constructionId, albumSpineElement.data.id)) {
      albumSpineElement.setState('opened');
    }
    return div.children[0];
  }

  async function prepareAlbumSpineElement(spineDiv, album) {
    let albumDetail = await album.albumDetailPromise;

    //spineDiv.querySelector('.comtext').innerHTML = "<div>"+albumDetail.albumSettings.albumName+"</div>";
    let nameDiv = document.createElement('div');
    nameDiv.textContent = albumDetail.albumSettings.albumName;
    spineDiv.querySelector('.comtext').textContent = '';
    spineDiv.querySelector('.comtext').appendChild(nameDiv);
    if (spineDiv.querySelector('.spine-cover').src.includes('default')) {
      spineDiv.querySelector('.spine-cover').src = 'images/aa_default.jpg'
    } else if (albumDetail.spineCover) {
      spineDiv.querySelector('.spine-cover').src =
        path2Url(albumDetail.spineCover, true);
    }
    if (albumDetail.albumSettings &&
      albumDetail.albumSettings.bookCoverOption) {
      let coverOption = albumDetail.albumSettings.bookCoverOption;

      // Display album when reducedImage = 0
      const previewEl = spineDiv.querySelector('.preview');
      const useReducedImage = coverOption.reducedImage === 0 &&
        typeof coverOption.reducedImagePath === 'string' &&
        coverOption.reducedImagePath.length !== 0;
      if (useReducedImage) {
        let albumFrames = await bookrackAccessor.getAlbumFrames(
          ctx.constructionId, albumDetail.albumId, albumDetail.albumSettings.bookCoverOption.reducedImagePosition - 1, 1);
        let firstFrame = albumFrames.albumFrames[0];
        let flip = firstFrame.textFrames.hasOwnProperty('goyo.photo.flip') &&
          firstFrame.textFrames['goyo.photo.flip'].fieldValue === 'true';
        let rotate = (firstFrame.textFrames.hasOwnProperty('goyo.photo.rotate') &&
            parseInt(firstFrame.textFrames['goyo.photo.rotate'].fieldValue)) || 0;
        previewEl.src = path2Url(coverOption.reducedImagePath, true, customSchema);
        
        previewEl.onload = function () {
          let bookrackHeight = document.querySelector('#album_spine_list').offsetHeight;
          const minAlbumWidth = precisionRound(bookrackHeight * 42 / 452, PRECISION);
          let width = minAlbumWidth;
          let rate = this.naturalWidth / this.naturalHeight
          let height = width / rate;
          if (flip) {
            switch (rotate) {
              case 0:
              previewEl.style.transform = 'rotate(0deg) scaleX(-1)';
                break;
              case 90:
              previewEl.style.transform = 'rotate(90deg) scaleX(-1)';
                break;            
              case 180:
              previewEl.style.transform = 'rotate(180deg) scaleX(-1)';
                break;            
              case 270:
              previewEl.style.transform = 'rotate(270deg) scaleX(-1)';
                break;
              default:
                break;
            }
          } else {
            switch (rotate) {
              case 0:
              previewEl.style.transform = 'rotate(0deg)';
                break;
              case 90:
              previewEl.style.transform = 'rotate(90deg)';
                break;            
              case 180:
              previewEl.style.transform = 'rotate(180deg)';
                break;            
              case 270:
              previewEl.style.transform = 'rotate(270deg)';
                break;
              default:
                break;
            }
          }
          setTimeout(() => {
            if (height > width) {
              previewEl.style.width = (width * rate) + 'px';
              switch (rotate) {
                case 0:
                case 180:
                  previewEl.style.bottom = 10 + 'px';
                  break;            
                case 90:
                case 270:
                previewEl.style.bottom = -((width - width * rate) * 0.5) + 10 + 'px';
                  break;
                default:
                  break;
              }
            } else {
              switch (rotate) {
                case 0:
                case 180:
                  previewEl.style.bottom = 10 + 'px';
                  break;            
                case 90:
                case 270:
                  previewEl.style.bottom = (width - height) * 0.5 + 10 + 'px';
                  break;
                default:
                  break;
              }
              previewEl.style.width = width + 'px';
            }
          }, 20);
          previewEl.style.display = '';
        };
      }
      else {
        previewEl.style.display = 'none';
      }


      spineDiv.querySelector('.star-icon').style.display =
        coverOption.photoInformationIcon === 1 ? 'inherit' : 'none';

      // Load font for album name
      if (coverOption.font) {
        if (coverOption.font.fontName) {
          for (const characterElem of spineDiv.querySelector('.comtext').children) {
            characterElem.style.fontFamily = coverOption.font.fontName;
          }
        }
        spineDiv.style.color = coverOption.font.fontColor || 'black';
        if (coverOption.font.fontSize != undefined) {
          let fontSize = cal(coverOption.font.fontSize, 12, 36);
          spineDiv.style.fontSize = `${fontSize}px`;
        }
        if (coverOption.font.fontWeight != undefined) {
          spineDiv.style.fontWeight = coverOption.font.fontWeight;
        }
        if (coverOption.font.fontStyle != undefined) {
          if (coverOption.font.fontStyle === 'italic'
            || coverOption.font.fontStyle === 'oblique') {
            spineDiv.querySelector('.comtext').style.paddingTop = '5px';
            for (const characterElem of spineDiv.querySelector('.comtext').children) {
              characterElem.style.transform = 'skew(0deg, 20deg)';
            };
          } else {
            spineDiv.style.fontStyle = coverOption.font.fontStyle;
          }
        }
        if (coverOption.font.textDecoration != undefined &&
          coverOption.font.textDecoration.trim() != '') {
          spineDiv.style.textDecoration = coverOption.font.textDecoration.replace(/;/g, '');
        }
        updateFooterBoxName(spineDiv, coverOption);
      }
      if (coverOption.horizontalName === 1) {
        const comtextEl = spineDiv.querySelector('.comtext');
        comtextEl.style.writingMode = 'vertical-lr';
        comtextEl.style.textOrientation = 'sideways';
      } else {
        const comtextEl = spineDiv.querySelector('.comtext');
        comtextEl.style.textOrientation = 'mixed';
      }
    }

    spineDiv.data.id = albumDetail.albumId;
    spineDiv.data.albumType = albumDetail.albumType;
    if (albumDetail.albumSettings) {
      spineDiv.data.albumName = albumDetail.albumSettings.albumName ? albumDetail.albumSettings.albumName : "";
      if (albumDetail.albumSettings.bookCoverOption) {
        spineDiv.data.reducedImage =
          albumDetail.albumSettings.bookCoverOption.reducedImage ? albumDetail.albumSettings.bookCoverOption.reducedImage : "";
        spineDiv.data.photoInformationIcon =
          albumDetail.albumSettings.bookCoverOption.photoInformationIcon ? albumDetail.albumSettings.bookCoverOption.photoInformationIcon : "";
      }
    }
    spineDiv.data.frameTotalCount = albumDetail.frameTotalCount;
    spineDiv.data.spineCover = albumDetail.spineCover;
  }

  async function menuIconSetting() {
    logger.trace('menuIconSetting(): begin');

    removeIconDeliverable();

    logger.trace('menuIconSetting(): initaialize Kuraemon connect button.');
    let connectButton = document.querySelector('#connect-button > img');
    let parent = remote.getCurrentWindow();
    connectButton.onclick = function () {
      kuraemonConnect.isRunnable().then(async r => {
        if (r) {
          // check other shared lock Construction
          if (await checkSharedLock(ctx.constructionId)) {
            return;
          }
          let promise = kuraemonConnect.run(ctx.constructionId);
          promise.then(
            async (result) => {
              if (result) {
                remote.getCurrentWindow().close();
              } else {
                await goyoDialog.showErrorMessageDialog(parent, 'エラー',
                  `蔵衛門コネクトを起動できません。\n蔵衛門コネクトを再インストールするか、${goyoAppDefaults.GOYO_SUPPORT_NAME}（${goyoAppDefaults.GOYO_SUPPORT_PHONE_NUMBER}）まで${goyoAppDefaults.GOYO_SUPPORT_CONTACT_ACTION}`, 'OK');
                htmlOpener.openConnectSite();
              }
            }
          ).catch((e) => { });
        }else{
          // コネクトが起動できない状態
          await goyoDialog.showErrorMessageDialog(parent, 'エラー',
                  `蔵衛門コネクトがインストールされていません。\n蔵衛門.comからインストールしてください。（無料）`, 'OK');
          htmlOpener.openConnectSite();
        }
      });
    };

    logger.trace('menuIconSetting(): initaialize menu buttons.');
    // bookrack list button
    document.querySelector('#bookrack-list-button > img').onclick = function () {
      viewMode.setNextMode(viewMode.MODE_BOOKRACK_LIST, {
        constructionId: ctx.constructionId,
        defaultBookrackId: ctx.bookrackId
      });
      window.close();
    };

    // construction list button
    document.querySelector('#construction-list-button > img').onclick =
      function () {  // icon setting for 「工事の選択と管理」
        viewMode.setNextMode(
          viewMode.MODE_CONSTRUCTION_SELECTION,
          { selectionMode: 'normal', defaultConstructionId: ctx.constructionId });
        window.close();
      };

    // construction information button
    document.querySelector('#construction-information-button > img').onclick =
      async function () {  // icon setting for 「工事情報」
        if (!this.classList.contains('disabled-menu-icon')) {
          // check other shared lock Construction
          if (await checkSharedLock(ctx.constructionId)) {
            return;
          }

          this.classList.add('disabled-menu-icon');
          await constructionOperation.edit(
            remote.getCurrentWindow(), ctx.constructionId);
          this.classList.remove('disabled-menu-icon');
          // const { construction } =
          //   await bookrackAccessor.getConstructionDetail(ctx.constructionId);
          // document.querySelector('.construction_name').textContent =
          //   construction.constructionName;
          // document.querySelector('.knack_name').textContent =
          //   `【${construction.knack.knackName}】`;
        }
      };

    // backup button
    document.querySelector('#backup-button > img').onclick =
      async function () {  // icon setting for 「本棚のバックアップを作成」

        // check other shared lock Construction
        if (await checkSharedLock(ctx.constructionId)) {
          return;
        }

        if (!this.classList.contains('disabled-menu-icon')) {
          this.classList.add('disabled-menu-icon');
        }
        ctx.bookrackViewWindowSet.setEnable(false);
        let albumIds = [];
        for (const album of ctx.albums) {
          albumIds.push(album.bookrackItemId);
        }
        try {
          let target = new menuActions.ActionTarget({
            constructionId: ctx.constructionId,
            bookrackId: ctx.bookrackId,
            albumId: albumIds
          });
          let actionId = 'BACKUP:BACKUP-CONSTRUCTION';
          const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
          await sharedCheckThenRun(menuActionFunc);
        } catch (e) {
          console.log('error', e);
        } finally {
          ctx.bookrackViewWindowSet.setEnable(true);
          this.classList.remove('disabled-menu-icon');
        }
      };
    document.querySelector('#deliverable-button > img').onclick =
      async function () {  // icon setting for 「電子納品データ出力」
        ctx.bookrackViewWindowSet.setEnable(false);
        try {
          // check other shared lock Construction
          if (licenseManager.licenseType === 'standard') {
            await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), 11);
            return;
          }
          if (await checkSharedLock(ctx.constructionId)) {
            return;
          }
          let albumIds = [];
          ctx.albums.forEach((album) => {
            albumIds.push(album.bookrackItemId);
          })
          let result = await goyoDialog.showDeliverableDataOutputDialog(
            remote.getCurrentWindow(), ctx.constructionId, albumIds);
        } catch (e) {
          console.log('error', e);
          throw e;
        } finally {
          ctx.bookrackViewWindowSet.setEnable(true);
        }
      };

    // program setting button
    document.querySelector('#program-setting-button > img').onclick =
      async function () {  // icon setting for 「プログラム全体の設定」
        ctx.bookrackViewWindowSet.setEnable(false);
        try {
          // check other shared lock Construction
          if (await checkSharedLock(ctx.constructionId)) {
            return;
          }
          let result =
            await programSettings.showEditDialog(remote.getCurrentWindow(), {constructionId: ctx.constructionId});
        } catch (e) {
          console.error(e);
        } finally {
          ctx.bookrackViewWindowSet.setEnable(true);
        }
      };

    // manual button
    document.querySelector('#show-manual-button > img').onclick =
      function () {  // icon setting for 「マニュアルを表示」
        htmlOpener.openManual();
      };

    // information button
    document.querySelector('#show-information-button > img').onclick =
      async function () {  // icon setting for 「お知らせ」
        ctx.bookrackViewWindowSet.setEnable(false);
        await goyoWebInfo.openUpdateInformation(remote.getCurrentWindow());
        ctx.bookrackViewWindowSet.setEnable(true);
      };

    // minimize button
    document.querySelector('#minimize-button > img').onclick =
      async function () {  // icon setting for 「本棚を最小化」
        remote.getCurrentWindow().minimize();
      };

    // quit application button
    document.querySelector('#quit-button > img').onclick =
      async function () {  // icon setting for 「御用達を終了」
        window.close();
      };
    logger.trace('menuIconSetting(): end');
  }

  function treeviewIconSetting(constructionId) {
    logger.trace('treeviewIconSetting(): begin');
    document.querySelector('.open-treeview-window')
      .addEventListener('click', async () => {
        viewMode.setNextMode(
          viewMode.MODE_TREE_VIEW, { constructionId: ctx.constructionId, bookrackItemId: ctx.bookrackId });
        window.close();
      });
  }

  function footerRightClickSetting(footerElement) {
    footerElement.addEventListener('contextmenu', footerElementRightclickHandler);
    footerElement.addEventListener(
      'mouseenter',
      (evt) => {
        footerElement.addEventListener(
          'space-keydown', footerElementRightclickHandler)
      });
    footerElement.addEventListener('mouseleave', (evt) => {
      footerElement.removeEventListener(
        'space-keydown', footerElementRightclickHandler);
    });
    async function footerElementRightclickHandler(event) {
      if (selectedAlbums.length <= 1) {
        event.stopPropagation();
        let coordinates = [];
        coordinates.push(footerElement.parentNode.getBoundingClientRect());

        let target = new menuActions.ActionTarget({
          constructionId: ctx.constructionId,
          bookrackId: ctx.bookrackId,
          boxId: this.data.id
        });

        let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
          mainTargetName: this.data.name,
          menuType: MENU_TYPE.OPENED_BOX,
          highlightAreas: coordinates
        });
        if (actionId) {
          const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
          await sharedCheckThenRun(menuActionFunc);
        }
      } else {
        event.stopPropagation();

        let coordinates = [];
        let footerHeight = 0;
        if (document.querySelector('.footer-album-box')) {
          footerHeight = document.querySelector('.footer-album-box')
            .getBoundingClientRect()
            .height;
        }
        selectedAlbums.forEach((album) => {
          let coordinate = getWritableCoordinate(album);
          if (album.parentNode.className.includes('album_box_expanded')) {
            coordinate.height -= footerHeight;
          }
          coordinates.push(coordinate);
        });

        ctx.selectedItem = selectedAlbums[0];

        let target = new menuActions.ActionTarget({
          constructionId: ctx.constructionId,
          bookrackId: ctx.bookrackId,
          boxId: selectedAlbums
            .filter(item => !item.data.hasOwnProperty('albumName'))
            .map(box => box.data.id),
          albumId:
            selectedAlbums.filter(item => item.data.hasOwnProperty('albumName'))
              .map(album => album.data.id)
        });

        try {
          let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
            mainTargetName: selectedAlbums[0].data.name,
            menuType: MENU_TYPE.MULTI_ALBUM,
            highlightAreas: coordinates
          });
          if (actionId) {
            const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
            await sharedCheckThenRun(menuActionFunc);
          }
        } catch (e) {
          console.log('error', e);
        }
      }
    }
  }

  function rightClickSetting() {
    logger.trace('rightClickSetting(): begin');
    // Context menu setting for bookrack.
    window.addEventListener('space-keydown', (evt) => {
      windowRightclickHandler(evt);
    });
    window.addEventListener('contextmenu', windowRightclickHandler);
    async function windowRightclickHandler(e) {
      e.stopPropagation();
      if (selectedAlbums.length > 1) {
        let coordinates = [];
        let footerHeight = 0;
        if (document.querySelector('.footer-album-box')) {
          footerHeight = document.querySelector('.footer-album-box')
            .getBoundingClientRect()
            .height;
        }
        selectedAlbums.forEach((album) => {
          let coordinate = getWritableCoordinate(album);
          if (album.parentNode.className.includes('album_box_expanded')) {
            coordinate.height -= footerHeight;
          }
          coordinates.push(coordinate);
        });

        ctx.selectedItem = selectedAlbums[0];

        let target = new menuActions.ActionTarget({
          constructionId: ctx.constructionId,
          bookrackId: ctx.bookrackId,
          boxId: selectedAlbums
            .filter(item => !item.data.hasOwnProperty('albumName'))
            .map(box => box.data.id),
          albumId:
            selectedAlbums.filter(item => item.data.hasOwnProperty('albumName'))
              .map(album => album.data.id)
        });

        try {
          let actionId = await goyoMenu.show(remote.getCurrentWindow(), target, {
            mainTargetName: selectedAlbums[0].data.name,
            menuType: MENU_TYPE.MULTI_ALBUM,
            highlightAreas: coordinates
          });
          if (actionId) {
            const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
            await sharedCheckThenRun(menuActionFunc);
          }
        } catch (e) {
          console.log('error', e);
        }
      } else if (openMenusheetByWindow()) {
        let albumIds = [];
        for (const album of ctx.albums) {
          albumIds.push(album.bookrackItemId);
        }
        let selectedAlbum =
          (selectedAlbums.length > 0 && selectedAlbums[0] && selectedAlbums[0].data)
            ? selectedAlbums[0].data.id
            : null;

        let target = new menuActions.ActionTarget({
          constructionId: ctx.constructionId,
          bookrackId: ctx.bookrackId,
          //albumId: albumIds,  // Do not set albumId for MENU_TYPE.BOOKRACK
          selectedAlbum,        // it will be used only in search actions.
        });
        let actionId = await goyoMenu.show(
          remote.getCurrentWindow(), target,
          { mainTargetName: '', menuType: MENU_TYPE.BOOKRACK });
        if (actionId) {
          const menuActionFunc = async ()=>await menuActions.run(actionId, remote.getCurrentWindow(), target);
          await sharedCheckThenRun(menuActionFunc);
        }
      }
    logger.trace('rightClickSetting(): end');
    }

    function openMenusheetByWindow() {
      const selectedCount = selectedAlbums.length;
      const someFooterHovered =
        !!document.querySelector('.footer-album-box:hover');
      const someAlbumHovered =
        !!(document.querySelector('.album_box:hover') ||
          document.querySelector('.album_spine:hover'));
      return (selectedCount <= 1 && !someFooterHovered && !someAlbumHovered);
    }
  }

  function initializeSettingOperations() {
    logger.trace('initializeSettingOperations(): define internal funcs');
    async function updateBookrackSetting(constructionId) {
      if (constructionId === ctx.constructionId) {
        await updateBookrackItems();
      }
    }
    async function updateBoxSetting(constructionId, boxId) {
      if (constructionId === ctx.constructionId) {
        try {
          // reload box information.
          let result = await bookrackAccessor.getBookrackItems(constructionId);
          let boxInfo = await settingsOperation.findBookrackItem(
            result.bookrackItems, boxId);
          if (!boxInfo.bookrackItem) return;
          let newBox = ctx.boxes.find(box => { return box.bookrackItemId === boxInfo.bookrackItem.bookrackItemId });
          newBox.colorType = boxInfo.bookrackItem.colorType;
          newBox.bookrackItemName = boxInfo.bookrackItem.bookrackItemName;
          let boxElements = document.querySelectorAll('.album_box');
          let boxExpandedElements =
            document.querySelectorAll('.album_box_expanded');
          let elm = Array.from(boxElements).find(elm => elm.data.id === boxId);
          if (!elm) {
            elm = Array.from(boxExpandedElements)
              .find(elm => elm.data.id === boxId);
            if (!elm) return;

            let footerElm = elm.querySelector('.footer-album-box');
            footerElm.data.name = boxInfo.bookrackItem.bookrackItemName;
            footerElm.data.colorType = parseInt(boxInfo.bookrackItem.colorType);
            let nameDiv = document.createElement('span');
            nameDiv.textContent = elm.data.name;
            footerElm.textContent = '';
            footerElm.appendChild(nameDiv);
            footerElm.style.backgroundImage =
              `url("../common/images/BOX/BOXFR/BOXFR_0${
              footerElm.data.colorType}.png`;
            let borderElm = elm.querySelectorAll('.album-box-border');
            borderElm[0].style.backgroundImage =
              `url("../common/images/BOX/BOXSD/BOXSD_0${
              footerElm.data.colorType}.png`;
            borderElm[1].style.backgroundImage =
              `url("../common/images/BOX/BOXSD/BOXSD_0${
              footerElm.data.colorType}_2.png`;
            footerElm.querySelector('span').innerText = footerElm.data.name;
          } else {
            elm.data.colorType = parseInt(boxInfo.bookrackItem.colorType);
            if (elm.data.name !== boxInfo.bookrackItem.bookrackItemName) {
              let style = elm.querySelector('.comtext2').children[0].style;
              elm.data.name = boxInfo.bookrackItem.bookrackItemName;
              elm.querySelector('.comtext2').innerHTML = '';
              let characters = elm.data.name.split('');
              for (const character of characters) {
                let characterElem = document.createElement('div');
                characterElem.innerText = character;
                characterElem.style.transform = style.transform;
                characterElem.style.fontFamily = style.fontFamily;
                elm.querySelector('.comtext2').appendChild(characterElem);
              };
              const boxNameHeight = parseInt(window.getComputedStyle(elm.querySelector('.comtext2'), null).getPropertyValue('height'));
              let totlalHeight = 0;
              for (const characterElem of elm.querySelector('.comtext2').children) {
                totlalHeight += parseInt(window.getComputedStyle(characterElem, null).getPropertyValue('height'));
              }
            }
            elm.querySelector('.box-cover').src =
              `../common/images/BOX/BOXBK/BOXBK_0${escape(elm.data.colorType)}.png`;
          }
          if (selectedAlbums[0].data.id === elm.data.id) {
            selectedAlbums[0].onmouseover();
          }
        } catch (e) {
          console.log('error', e);
        }
      }
    }
    async function updateBookrackItems() {
      // reload bookrack_window
      if (document.busy !== true) {
        document.busy = true;
        const albumSpineList = document.querySelector('#album_spine_list');
        const oldClassItems = [];
        const boxExpanded = [];
        const albumSpineOpened = [];
        let selectedItem = selectedAlbums[0].classList.contains('selected_album_main_mark') ? selectedAlbums[0]: null;
        let scrolledElement = document.querySelector('.scrolled');
        if (!scrolledElement) {
          resetScrolledElement();
        }
        while (albumSpineList.firstChild) {
          if (albumSpineList.firstChild.classList &&
            albumSpineList.firstChild.data &&
            albumSpineList.firstChild.data.id) {
            if (albumSpineList.firstChild.classList[0] === 'album-tray') {
              for (const childOfTray of albumSpineList.firstChild.childNodes) {
                if (childOfTray.classList && childOfTray.data &&
                  childOfTray.data.id) {
                  oldClassItems.push(childOfTray.data.id);
                  if (childOfTray.classList[0] === 'album_box_expanded') {
                    for (const album of childOfTray.childNodes) {
                      if (AlbumWindowSet.isOpened(ctx.constructionId, album.data.id)) {
                        albumSpineOpened.push(album.data.id);
                      }
                    }
                    boxExpanded.push(childOfTray.data.id);
                  }
                  if (childOfTray.classList[0] === 'album_spine' &&
                    AlbumWindowSet.isOpened(ctx.constructionId, childOfTray.data.id)) {
                    albumSpineOpened.push(childOfTray.data.id);
                  }
                }
              }
              oldClassItems.push(albumSpineList.firstChild.data.id);
            } else {
              if (albumSpineList.firstChild.classList[0] ===
                'album_box_expanded') {
                boxExpanded.push(albumSpineList.firstChild.data.id);
                for (const album of albumSpineList.firstChild.childNodes) {
                  if (AlbumWindowSet.isOpened(
                    ctx.constructionId, album.data.id)) {
                    albumSpineOpened.push(album.data.id);
                  }
                }
              }
              if (albumSpineList.firstChild.classList[0] === 'album_spine' &&
                AlbumWindowSet.isOpened(
                  ctx.constructionId, albumSpineList.firstChild.data.id)) {
                albumSpineOpened.push(albumSpineList.firstChild.data.id);
              }
              oldClassItems.push(albumSpineList.firstChild.data.id);
            }
          }
          delete albumSpineList.removeChild(albumSpineList.firstChild);
        }
        await initializeAlbum();
        if(scrolledElement) {
          let idScrolled = scrolledElement.data.id;
          updateGIndex();
          idScrolled = _displayItems(oldClassItems, boxExpanded, albumSpineOpened, albumSpineList, idScrolled);
          _setScrolled(idScrolled);
        }
        document.busy = false;
      }
      function _displayItems(oldClassItems, boxExpanded, albumSpineOpened, albumSpineList, idScrolled) {
        clearSelectedAlbums(3);
        let newClassItems = [];
        for (const child of albumSpineList.childNodes) {
          if (child.classList && child.data && child.data.id) {
            let itemsIdChild = [];
            if (child.classList.contains('album-tray')) {
              let box = [];
              let firstChild = null;
              for (const childOfTray of child.childNodes) {
                itemsIdChild.push(childOfTray.data ? childOfTray.data.id : -1);
                if(!firstChild && childOfTray.data && childOfTray.data.id) {
                  firstChild = childOfTray;
                }
                if (childOfTray.classList.contains('album_box') &&
                  childOfTray.data && childOfTray.data.id) {
                  box.push(childOfTray);
                  itemsIdChild.push(childOfTray.data.id);
                  for (const item of childOfTray.data.children) {
                    itemsIdChild.push(item.bookrackItemId);
                  }
                  newClassItems.push({
                    id: childOfTray.data.id,
                    class: 'album_box',
                    item: childOfTray,
                    itemsIdChild: itemsIdChild,
                  });
                }
              }
              newClassItems.push(
                { id: child.data.id, class: child.classList[0], itemsIdChild: itemsIdChild, box: box, firstChild: firstChild});
            } else {
              if (child.classList.contains('album_box')) {
                itemsIdChild.push(child.data.id);
                for (const item of child.data.children) {
                  itemsIdChild.push(item.bookrackItemId);
                }
                newClassItems.push(
                  { id: child.data.id, class: 'album_box', itemsIdChild: itemsIdChild, item: child });
              }
            }
          }
        }
        for (let index = 0; index < newClassItems.length; index++) {
          const newClassItem = newClassItems[index];
          if (!oldClassItems.includes(newClassItem.id)) {
            if (newClassItem.class === 'album_box') {
              selectedAlbums[0] = newClassItem.item;
              addSelectedMark(newClassItem.item);
              newClassItem.item.ondblclick(0);
              if (newClassItem.itemsIdChild.includes(idScrolled)) {
                idScrolled = newClassItem.item.data.id;
              }
            }
            if (newClassItem.class === 'album-tray') {
              selectedAlbums[0] = newClassItem.firstChild;
              addSelectedMark(selectedAlbums[0]);
              for (const box of newClassItem.box) {
                box.ondblclick();
              }
              if (newClassItem.itemsIdChild.includes(idScrolled)) {
                idScrolled = newClassItem.firstChild.data.id;
              }
            }
          }
        }
        boxExpanded.forEach(id => {
          let box = _getItem(id, newClassItems);
          if (box) {
            box.ondblclick();
          }
        });
        newClassItems = [];
        for (const child of albumSpineList.childNodes) {
          if (child.classList && child.data && child.data.id) {
            if (child.classList[0] === 'album-tray') {
              for (const childOfTray of child.childNodes) {
                if (childOfTray.classList[0] === 'album_box_expanded' &&
                  childOfTray.data && childOfTray.data.id) {
                  for (const album of childOfTray.childNodes) {
                    if (album.classList[0] === 'album_spine') {
                      newClassItems.push({
                        id: album.data.id,
                        class: album.classList[0],
                        item: album
                      });
                    }
                  }
                } else if (childOfTray.classList[0] === 'album_spine') {
                  newClassItems.push({
                    id: childOfTray.data.id,
                    class: childOfTray.classList[0],
                    item: childOfTray
                  });
                }
              }
            } else if (child.classList[0] === 'album_spine') {
              newClassItems.push(
                { id: child.data.id, class: child.classList[0], item: child });
            } else if (child.classList[0] === 'album_box_expanded') {
              for (const album of child.childNodes) {
                if (album.classList[0] === 'album_spine') {
                  newClassItems.push({
                    id: album.data.id,
                    class: album.classList[0],
                    item: album
                  });
                }
              }
            }
          }
        }
        albumSpineOpened.forEach(id => {
          let album = _getItem(id, newClassItems)
          if (album) {
            album.querySelector('.shadow').style.width = '100%';
            album.data.opened = true;
          }
        });
        return idScrolled;
      }
      function _getItem(id, items) {
        for (const item of items) {
          if (item.id === id) {
            if(item.item) {
              return item.item;
            } else if (item.firstChild) {
              return item.firstChild;
            }
          }
        }
        return null;
      }
      function _setScrolled(idScrolled) {
        let child = $('[data-id="' + idScrolled + '"]');
        if (!child.length) {
          setTimeout(() => {
            _setScrolled(idScrolled);
          }, 50);
        } else {
          let childPos = child[0].getBoundingClientRect();
          let parPos = document.querySelector('.bookrack-scroller').getBoundingClientRect();
          document.querySelector('.scrolled') && document.querySelector('.scrolled').classList.remove('scrolled');
          child[0].classList.add('scrolled');
          if(child[0].data.indexOfFirstAlbum == undefined){
            child[0].data.indexOfFirstAlbum = 0;
          }
          document.pageControl.indexAlbum = child[0].data.indexInConstruction
                                            ? child[0].data.indexInConstruction
                                            : child[0].data.indexOfFirstAlbum;
        }
      }
    }
    async function updateAlbumSetting(constructionId, albumId) {
      if (constructionId === ctx.constructionId) {
        try {
          let albumSpineElement = $('[data-id="' + albumId + '"]')[0];
          if (!albumSpineElement) return;

          let album = ctx.albums[albumSpineElement.data.indexInConstruction];

          ensureLoadingAlbumDetails([album], true);
          await album.albumDetailPromise;
          //ctx.albums[albumSpineElement.data.indexInConstruction].albumDetail = (await bookrackAccessor.getAlbumDetail(ctx.constructionId, albumId)).albumDetail;
          await prepareAlbumSpineElement(albumSpineElement, album);
          updateAlbumWidth(albumSpineElement);
          if (selectedAlbums[0].data.id === albumSpineElement.data.id) {
            selectedAlbums[0].onmouseover();
          }
        } catch (e) {
          console.log('error', e);
        }
      }
    }
    async function applyNewBookrackItem(
      constructionId, bookrackItemId, refreshView = true, showMessage = true) {
      // TODO:
      // This is a dummy process.
      // The person in charge of bookrack_window should add bookrackItem when
      // bookrackItem is added Compartment, BOX, album needs to correspond

      if (refreshView) {
        // if (showMessage) {
        //   await goyoDialog.showSimpleMessageDialog(
        //     remote.getCurrentWindow(), goyoAppDefaults.DIALOG_TITLE,
        //     'アルバム作成が完了しました。', 'OK');
        // }
        await updateBookrackItems();
      }
    }
    async function applyNewAlbum(
      constructionId, albumIds, siblingItemId, siblingFlag) {
      disableUserActions();
      try {
        let { bookrackItems } =
          await bookrackAccessor.getBookrackItems(constructionId);
        bookrackItems = JSON.parse(JSON.stringify(bookrackItems));
        displayBackupButton(bookrackItems);
        const bookrackData =
          bookrackItems.find(u => u.bookrackItemId === ctx.bookrackId) ||
          bookrackItems[0];
        const allAlbums = getAlbumFromBookrackItem(bookrackData);
        const newAlbums =
          allAlbums.filter((album) => albumIds.includes(album.bookrackItemId));
        ensureLoadingAlbumDetails(newAlbums);
        const albumSpineList = document.querySelector('#album_spine_list');
        for (let i = 0; i < newAlbums.length; i++) {
          //newAlbums[i].albumDetail =
          //  (await bookrackAccessor.getAlbumDetail(
          //    constructionId, newAlbums[i].bookrackItemId))
          //    .albumDetail;
          ctx.albums.push(newAlbums[i]);
          const albumSpine = await createAlbumSpineElement(newAlbums[i], 0, ctx.albums.length - 1);
          addAlbumSpineMouseHanlder(albumSpine);
          albumSpine.classList.add('bookrack-item');
          if (typeof siblingItemId === 'number') {
            let siblingElem = Array.from(document.querySelectorAll('.album_spine'))
              .find(ele => ele.data.id === siblingItemId);
            //let siblingElem = Array.prototype.filter.call(
            //  document.querySelectorAll('.album_spine'),
            //  (ele) => ele.data.id === siblingItemId)[0];
            if (siblingElem == null) {
              if (i === 0 && !albumSpineList.querySelector('.scrolled')) {
                albumSpine.classList.add('scrolled');
              }
              albumSpineList.appendChild(albumSpine);
            } else {
              if (siblingFlag === 'before') {
                if (siblingElem.classList.contains('scrolled')) {
                  siblingElem.classList.remove('scrolled');
                  albumSpine.classList.add('scrolled');
                }
                let parentElem = siblingElem.parentElement;
                parentElem.insertBefore(albumSpine, siblingElem);
              } else {
                siblingElem.after(albumSpine);
              }
            }
          } else {
            if (i === 0 && !albumSpineList.querySelector('.scrolled')) {
              albumSpine.classList.add('scrolled');
            }
            albumSpineList.appendChild(albumSpine);
          }
          updateAlbumWidth(albumSpine);
        }
        await updateAlbumData();
        if (document.querySelector('.selected_album_main_mark')) {
          document.querySelector('.selected_album_main_mark').onmouseover();
        } else {
          selectedAlbums[0] = document.querySelector('.album_spine');
          addSelectedMark(selectedAlbums[0]);
        }
        updateOtherWidth(albumSpineList);
      } catch(e) {
        logger.error('applyNewAlbum', e);
      } finally {
        enableUserActions();
      }
    }

    async function applyDeleteAlbum(constructionId, albumIds) {
      try {
        let oldAlbumsAndBoxs = Array.from(document.querySelectorAll('.album_spine, .album_box'));
        let bookrackItems = (await bookrackAccessor.getBookrackItems(constructionId)).bookrackItems;
        await deleteAllEmptyBoxes(bookrackItems);
        await deleteAllEmptyTrays();

        //空のBOX等を削除したときにscrolledの要素が無くなることがあるので最初の要素をscrolledにする
        const collection = $('.scrollable')
        const scrolledIndex = collection.index($('.scrolled'));
        if ( scrolledIndex < 0 && collection.length > 0 ) {
          collection[0].classList.add('scrolled');
        }

        let newAlbumsAndBoxs = Array.from(document.querySelectorAll('.album_spine, .album_box'));
        bookrackItems = (await bookrackAccessor.getBookrackItems(constructionId)).bookrackItems;
        displayBackupButton(bookrackItems);
        const bookrackData = bookrackItems.find(u => u.bookrackItemId === ctx.bookrackId) || bookrackItems[0];
        ctx.albums = ctx.albums.filter((album) => !albumIds.includes(album.bookrackItemId));
        ctx.boxes = getBoxFromBookrackItem(bookrackData);
        let nextSelected;
        for (let i = 0; i < oldAlbumsAndBoxs.length; i++) {
          if (albumIds.includes(oldAlbumsAndBoxs[i].data.id)) {
            if (oldAlbumsAndBoxs[i].classList.contains('scrolled')) {
              const nextScrolled = findNearestScrollable(oldAlbumsAndBoxs[i]);
              nextScrolled && nextScrolled.classList.add('scrolled');
            }
            if (i < oldAlbumsAndBoxs.length - 1) {
              if (newAlbumsAndBoxs.indexOf(oldAlbumsAndBoxs[i + 1]) !== -1) {
                nextSelected = oldAlbumsAndBoxs[i + 1];
              } else {
                nextSelected = newAlbumsAndBoxs[newAlbumsAndBoxs.length - 1];
              }
            } else {
              nextSelected = newAlbumsAndBoxs[newAlbumsAndBoxs.length - 1];
            }
            delete oldAlbumsAndBoxs[i].parentNode.removeChild(oldAlbumsAndBoxs[i]);
            if (document.querySelectorAll('.album_spine, .album_box').length === 0) {
              document.querySelector('.selected-album').innerText = '';
            }
          }
        }
        if ( nextSelected == null ) {
          nextSelected = newAlbumsAndBoxs[newAlbumsAndBoxs.length - 1];
        }
        
        if(!nextSelected.parentNode) {
          let reoderNode = Array.from(document.querySelectorAll('.album_spine, .album_box'));
          nextSelected = reoderNode[reoderNode.length - 1];
        }
        await updateAlbumData();
        selectedAlbums = [nextSelected];
        if (document.querySelectorAll('.album_spine, .album_box').length !== 0) {
          clearSelectedAlbums(1, nextSelected);
          let album = ctx.albums[nextSelected.data.indexInConstruction];
          let coverOption = {};
          if (album && album.albumDetail && album.albumDetail.albumSettings &&
            album.albumDetail.albumSettings.bookCoverOption) {
            coverOption = album.albumDetail.albumSettings.bookCoverOption;
          } else {
            coverOption.font = {fontColor: '#000000'};
          }
          updateFooterBoxName(nextSelected, coverOption);
        }
        
      } catch(e) {
        logger.error('applyDeleteAlbum', e);
      }
    }

    function findNearestScrollable(currentScrolled) {
      const scrollables = Array.from(document.querySelectorAll('.scrollable'));
      const currentScrolledIndex = scrollables.indexOf(currentScrolled);
      if (scrollables.length === 1) return;
      if (currentScrolledIndex < scrollables.length - 2) {
        return scrollables[currentScrolledIndex + 1];
      } else {
        return scrollables[currentScrolledIndex - 1];
      }
    }

    async function applyAlbumFrameCount(constructionId, albumId) {
      try {
        let albumSpineElement = $('[data-id="' + albumId + '"]')[0];
        if (!albumSpineElement) return;

        let album = ctx.albums[albumSpineElement.data.indexInConstruction];
        ensureLoadingAlbumDetails([album], true);
        //ctx.albums[albumSpineElement.data.indexInConstruction].albumDetail = (await bookrackAccessor.getAlbumDetail(ctx.constructionId, albumId)).albumDetail;
        await prepareAlbumSpineElement(albumSpineElement, album);
        if (selectedAlbums.length === 0) return;
        if (selectedAlbums[0].data.id === albumSpineElement.data.id) {
          selectedAlbums[0].onmouseover();
        }
        updateWidth(document.querySelector('#album_spine_list'));
      } catch (e) {
        logger.error('applyAlbumFrameCount', e);
      }
    }

    async function applyAlbumKnackType(knack) {
      try {
        document.querySelector('.knack_name').textContent = `【${knack.knackName}】`;
        let indentKnackName = parseInt(window.getComputedStyle(document.querySelector('.knack_name'), null).getPropertyValue('width')) + 25;
        document.querySelector('.construction_name').style.width = `calc(100% - ${indentKnackName}px)`;
      } catch (e) {
        logger.error('applyAlbumKnackType', e);
      }
    }

    async function applyConstructionInfo(constructionId) {
      try {
        const { construction } = await bookrackAccessor.getConstructionDetail(constructionId);
        document.querySelector('.construction_name').textContent =
          construction.constructionName;
        document.querySelector('.knack_name').textContent =
          `【${construction.knack.knackName}】`;
      } catch (e) {
        logger.error('applyConstructionInfo', e);
      }
    }

    function openAlbumListener(constructionId, albumId) {
      if (constructionId === ctx.constructionId) {
        let spines = Array.from(document.querySelectorAll('.album_spine'));
        let spine = spines.find(s => s.data.id === albumId);
        if (spine) {
          spine.setState('opened');
        }

        // expand box element if the target album was in closed box.
        let box = 
          Array.from(document.querySelectorAll('.album_box'))
          .find(b => b.data.bookrackItems.some(a => a.bookrackItemId===albumId))
        if (box) {
          box.ondblclick();
        }
      }
    }

    function closeAlbumListener(constructionId, albumId) {
      if (constructionId === ctx.constructionId) {
        let spines = Array.from(document.querySelectorAll('.album_spine'));
        let spine = spines.find(s => s.data.id === albumId);
        if (spine) {
          spine.setState('closed');
        }
      }
    }

    logger.trace('initializeSettingOperations(): begin');
    let params = (new URL(document.location)).searchParams;
    let forPreview = params.get('preview');
    if (forPreview !== 'true') {
      settingsOperation.on('changeBookrackSetting', updateBookrackSetting);
      settingsOperation.on('changeBookrackItems', updateBookrackItems);
      settingsOperation.on('changeBoxSetting', updateBoxSetting);
      settingsOperation.on('addNewBookrackItem', applyNewBookrackItem);
      settingsOperation.on('changeKnack', applyAlbumKnackType);
      constructionOperation.on('update-construction', applyConstructionInfo);
      albumOperation.on('update-frames', updateAlbumSetting);
      albumOperation.on('create-album', applyNewAlbum);
      albumOperation.on('delete-album', applyDeleteAlbum);
      albumOperation.on('update-album-setting', updateAlbumSetting);
      albumOperation.on('insert-frames', applyAlbumFrameCount);
      albumOperation.on('delete-frames', applyAlbumFrameCount);
      albumOperation.on('reorder-frames', applyAlbumFrameCount);
      AlbumWindowSet.on('opened', openAlbumListener);
      AlbumWindowSet.on('closed', closeAlbumListener);

      window.addEventListener('unload', () => {
        // windowの表示位置、サイズ設定を保存
        let bwParam = uiParam('all_bookrack_window');
        let currentWindow = remote.getCurrentWindow();
        let size = currentWindow.getSize();
        let position = currentWindow.getPosition();
        bwParam.windowWidth = size[0];
        bwParam.windowHeight = size[1];
        bwParam.windowX = position[0];
        bwParam.windowY = position[1];
        
        settingsOperation.removeListener(
          'changeBookrackSetting', updateBookrackSetting);
        settingsOperation.removeListener(
          'changeBookrackItems', updateBookrackItems);
        settingsOperation.removeListener('changeBoxSetting', updateBoxSetting);
        settingsOperation.removeListener(
          'addNewBookrackItem', applyNewBookrackItem);
        settingsOperation.removeListener('changeKnack', applyAlbumKnackType);
        constructionOperation.removeListener('update-construction', applyConstructionInfo);
        albumOperation.removeListener('update-frames', updateAlbumSetting);
        albumOperation.removeListener('create-album', applyNewAlbum);
        albumOperation.removeListener('delete-album', applyDeleteAlbum);
        albumOperation.removeListener('update-album-setting', updateAlbumSetting);
        albumOperation.removeListener('insert-frames', applyAlbumFrameCount);
        albumOperation.removeListener('delete-frames', applyAlbumFrameCount);
        albumOperation.removeListener('reorder-frames', applyAlbumFrameCount);
        AlbumWindowSet.removeListener('opened', openAlbumListener);
        AlbumWindowSet.removeListener('closed', closeAlbumListener);
      });
    }

    logger.trace('initializeSettingOperations(): end');
  }


  //window.addEventListener('load', onloadInitialize);
  async function onloadInitialize() {
    try {
    
      logger.trace('event listener load: begin');
      let startTime = Date.now();

      let params = (new URL(document.location)).searchParams;
      let constructionId = params.get('constructionId');
      let forPreview = params.get('preview');
      if (forPreview === 'true') {
        bookrackAccessor =
          remote.require('./lib/goyo-bookrack-preview').dummyAccessor;
        window.addEventListener('click', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('dblclick', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('contextmenu', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('mousedown', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('mouseup', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('keydown', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('mouseenter', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('mouseleave', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
        window.addEventListener('mouseover', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }, true);
      } else {
      }

      logger.trace('event listener load: define internal funcs');
      //D&D from sortout tool to bookrack_window
      let fromSortOutDrop = async function (evt, photoInfo) {
        let $target = $(evt.target);
        if ($target.hasClass('left-outer')) {
          return;
        }

        if (await checkSharedLock(ctx.constructionId)) {
          return;
        }

        if ($target.parents('.album_box').length > 0) {
          await goyoDialog.showWarningMessageDialog(
            remote.getCurrentWindow(),
            '写真整理ツール',
            'BOX上への操作では、工事写真情報の変更、アルバム作成等は行なえません。\n' +
            'BOXを展開後、アルバムに対して操作を行なってください。',
            'OK',
          );
          return;
        }

        if ($target.hasClass('album_spine') ||
          $target.parents('.album_spine').length > 0) {
          $target = $target.parents('.album_spine').length > 0 ?
            $($target.parents('.album_spine')[0]) :
            $target;
          let targetAlbumId = parseInt($target[0].data.id);
          if (targetAlbumId) {
            let albumDetail = await bookrackAccessor.getAlbumDetail(ctx.constructionId, targetAlbumId);
            albumDetail.albumDetail.albumSettings.photoInfoTemplate = {
              "largeClassification": photoInfo.largeClassification,
              "photoClassification": photoInfo.photoClassification,
              "constructionType": photoInfo.constructionType,
              "middleClassification": photoInfo.middleClassification,
              "smallClassification": photoInfo.smallClassification
            }
            albumDetail.albumDetail.albumSettings.bookCoverOption.photoInformationIcon = 1;
            albumOperation.updateAlbumSetting(ctx.constructionId, targetAlbumId, albumDetail.albumDetail.albumSettings, albumDetail.albumDetail.layout.albumTemplate, true);
          }
        } else {
          let albumSettings = await albumOperation.defaultAlbumSettings;
          albumSettings.bookCoverOption.photoInformationIcon = 1;
          albumSettings.albumName = photoInfo.albumName;
          albumSettings.photoInfoTemplate = {
            "largeClassification": photoInfo.largeClassification,
            "photoClassification": photoInfo.photoClassification,
            "constructionType": photoInfo.constructionType,
            "middleClassification": photoInfo.middleClassification,
            "smallClassification": photoInfo.smallClassification
          }
          let newAlbumId = (await albumOperation.createAlbums(ctx.constructionId, ctx.bookrackId, null, 1, albumSettings))[0];
          openAlbumFromAfterCreated(ctx.constructionId, newAlbumId);
        }
      };

      //D&D from albumView to bookrack_window
      let fromAlbumDrop = async function (evt, albumId, frames) {
        let $target = $(evt.target);
        if ($target.hasClass('left-outer')) {
          return;
        }

        let holder = holdWindowsStop();
        try {
          let progressWindow;
          let lockManager = null;
          let isLockAlbumItemdb = false;
          let targetAlbumId = 0;
          let createNewAlbum = false
          let parent = remote.getCurrentWindow();
          try {
            if ($target.hasClass('album_spine') || $target.parents('.album_spine').length > 0) {
              $target = $target.parents('.album_spine').length > 0 ?
                $($target.parents('.album_spine')[0]) : $target;
              targetAlbumId = parseInt($target[0].data.id);
            } else {
              if (await checkSharedLock(ctx.constructionId)) {
                return;
              }
            }

            if ($target.parents('.album_box').length > 0) {
              await goyoDialog.showWarningMessageDialog(
                remote.getCurrentWindow(),
                '写真整理ツール',
                'BOX上への操作では、工事写真情報の変更、アルバム作成等は行なえません。\n' +
                'BOXを展開後、アルバムに対して操作を行なってください。',
                'OK',
              );
              return;
            }

            let resultChkShareAlbumItemDB = await checkSharedAlbumItemDBLock(ctx.constructionId);
            isLockAlbumItemdb = resultChkShareAlbumItemDB.isLock;
            lockManager = resultChkShareAlbumItemDB.lockManager;
            if (!isLockAlbumItemdb){
              return;
            }
            
            if (targetAlbumId == 0) {
              targetAlbumId = (await albumOperation.createAlbums(ctx.constructionId, ctx.bookrackId, null, 1, null))[0];
              createNewAlbum = true;
            }
            if (!await checkSharedAlbumLock(ctx.constructionId, targetAlbumId)) {
              targetAlbumId = 0;
              await goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
              return;
            }

            let newFrames = [];
            let { albumFrames } = await bookrackAccessor.getAlbumFrames(ctx.constructionId, albumId);
            albumFrames.forEach((frame, index) => {
              if (frames.indexOf(index) !== -1) {
                if (frame.constructionPhotoInformation !== null &&
                  frame.constructionPhotoInformation.hasOwnProperty("参考図情報") &&
                  frame.referenceSouceAlbumFrameId !== 0) {
                  frame.referenceSouceAlbumFrameId = 0;
                  frame.constructionPhotoInformation = null;
                }
                if (frame.constructionPhotoInformation !== null &&
                  frame.constructionPhotoInformation.hasOwnProperty("写真情報") &&
                  frame.constructionPhotoInformation["写真情報"].hasOwnProperty("参考図")) {
                  let newPhotoInfo = {};
                  for (let index in frame.constructionPhotoInformation["写真情報"]) {
                    if (index === "参考図") {
                      continue
                    }
                    newPhotoInfo[index] = frame.constructionPhotoInformation["写真情報"][index];
                  };
                  frame.constructionPhotoInformation["写真情報"] = newPhotoInfo;
                }
                frame.albumFrameId = 0;
                if (frame.photoFrames) {
                  frame.photoFrames.forEach((photoFrame) => {
                    photoFrame.photoFrameId = 0;
                    photoFrame.albumItemId = 0;
                  });
                }
                if (frame.textFrames) {
                  for (let index in frame.textFrames) {
                    frame.textFrames[index].textFrameId = 0;
                  }
                }
                newFrames.push(frame);
              }
            });

            if (!newFrames) {
              return;
            }

            // show progress dialog.
            let canceller = { cancel: false };
            progressWindow = goyoDialog.showProgressDialog(parent, () => {
              canceller.cancel = true;
            });
            progressWindow.setProgress(0);

            // insert new frame into the album.
            var resultIds = await albumOperation.replaceAndInsertFrames(
              ctx.constructionId,
              targetAlbumId,
              newFrames,
              undefined,
              canceller, (done, total) => {
                progressWindow.setProgress((frames.length + done) / (frames.length + newFrames.length));
              });
            await progressWindow.close();
            progressWindow = null;

            // No need to show illegal photos if it was from other album.
            //if (programSettings.imageDetermination.verifyWhileReading == 1) {
            //  let idPairs = resultIds.map(fid => { return { albumId: targetAlbumId, frameId: fid } });
            //  let result = await albumOperation.showIllegalFrames(ctx.constructionId, idPairs);
            //  if (!result) {
            //    return;
            //  }
            //}

            // No need to open album.
            //let topOfNewFrame = await bookrackAccessor.getAlbumFrame(ctx.constructionId, targetAlbumId, resultIds[0]);
            //await openAlbumFromAfterCreated(ctx.constructionId, targetAlbumId, topOfNewFrame.albumFrame.displayNumber - 1);
            if (createNewAlbum) {
              await goyoDialog.showSimpleMessageDialog(
                parent, goyoAppDefaults.DIALOG_TITLE,
                `${resultIds.length}枚の写真を新しいアルバムにコピーしました。`, 'OK');
            } else {
              await goyoDialog.showSimpleMessageDialog(
                parent, goyoAppDefaults.DIALOG_TITLE,
                `${resultIds.length}枚の写真がコピーされました。`, 'OK');
            }
          } catch (e) {
            logger.error('PHOTO:FROM-ALBUM', e);
          } finally {
            if (progressWindow) {
              await progressWindow.close();
            }
            if (lockManager != null) {
              if(targetAlbumId != 0) {
                // release album lock
                await lockManager.lockAlbum(targetAlbumId, false)
                  .then(() => { })
                  .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
              }
              if (isLockAlbumItemdb) {
                // release construction lock
                await lockManager.lockAlbumItemDatabase(false)
                  .then(() => { })
                  .catch((e) => {
                    logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
                  });
              }
            }
          }
        } finally {
          holder.release();
        }
      };

      //D&D from outside to bookrack_window
      async function fromOutsideDrop(e) {
        let holder = holdWindowsStop();
        let isLockAlbumItemdb = false;
        let lockManager = null;
        try {
          if (e.target.className == 'footer-album-box'
            || e.target.parentElement.className == 'footer-album-box'
            || e.target.parentElement.classList[0] == 'album_box'
            || e.target.parentElement.className == 'comtext2'
            || e.target.parentElement.className == 'comtext2_1') {
            let message = 'BOX上への操作では、アルバムにファイルの追加は出来ません。' +
              '\nアルバムにファイルを追加する場合は、アルバムの背表紙に直' +
              '\n接ドロップしてください。';
            await goyoDialog.showWarningMessageDialog(remote.getCurrentWindow(), 'ファイル取込み', message, 'OK');
            return;
          }
          if (e.target.className == 'album-tray-left'
            || e.target.parentElement.className == 'album-tray-left'
            || e.target.className == 'album-tray-right'
            || e.target.className == 'album-tray-bottom'
            || e.target.classList[0] == 'album-tray') {
            let message = '仕切り上への操作では、アルバムにファイルの追加は出来ません。' +
              '\nアルバムにファイルを追加する場合は、アルバムの背表紙に直' +
              '\n接ドロップしてください。';
            await goyoDialog.showWarningMessageDialog(remote.getCurrentWindow(), 'ファイル取込み', message, 'OK');
            return;
          }
          const rootFolder = e.dataTransfer.files;

          let albumId;
          if (e.target.id == 'bookrack-space' || e.target.id == 'tablet'
            || e.target.className == 'left-outer' || e.target.className == 'right-outer') {
          } else {
            let target = e.target.parentElement;
            if (e.target.className == 'album-box-border') {
              if (!e.target.previousElementSibling) {
                target = e.target.nextElementSibling;
              } else {
                target = e.target.previousElementSibling;
                target = target.previousElementSibling;
              }
            }
            if (target.className == 'comtext') target = target.parentElement;
            albumId = target.data.id;
          }

          if (!albumId && await checkSharedLock(ctx.constructionId)) {
            return;
          }
          let resultChkShareAlbumItemDB = await checkSharedAlbumItemDBLock(ctx.constructionId);
          isLockAlbumItemdb = resultChkShareAlbumItemDB.isLock;
          lockManager = resultChkShareAlbumItemDB.lockManager;
          if (!isLockAlbumItemdb){
            return;
          }

          const fileList = makeFileList(rootFolder);
          if (fileList && fileList.length && !document.movingItem) {
            try {
              if (!albumId) {
                //Setting for new album
                let albumSettings = await albumOperation.defaultAlbumSettings;
                if (rootFolder.length == 1) {
                  let stat = await fse.stat(rootFolder[0].path);
                  // console.log(stat);
                  if (stat.isDirectory()) {
                    albumSettings.albumName = rootFolder[0].name;
                  }
                }
                albumId = (await albumOperation.createAlbums(parseInt(ctx.constructionId), parseInt(ctx.bookrackId), null, 1, albumSettings))[0]; //make new album
              }
              if (!await checkSharedAlbumLock(ctx.constructionId, albumId)) {
                albumId = 0;
                await goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
                return;
              }

              let result = await albumOperation.replaceAndInsertFramesWithProgress(
                remote.getCurrentWindow(),
                parseInt(constructionId),
                albumId,
                fileList,
                'Album',
                null,
                false
              );

              //if (!result.showIllegals && result.newFrameIds.length > 0) {
              //  await goyoDialog.showSimpleMessageDialog(
              //    remote.getCurrentWindow(), goyoAppDefaults.DIALOG_TITLE,
              //    '写真の登録が完了しました。', 'OK');
              //}
            } catch (e) {
            } finally {
              if (albumId != 0) {
                // release album lock
                await lockManager.lockAlbum(albumId, false)
                  .then(() => { })
                  .catch((e) => { logger.error('Failed to lockManager.lockAlbum(unlock)', e) });
              }
            }
            e.preventDefault();
            e.stopPropagation();
          }
        } finally {
          if (isLockAlbumItemdb) {
            // release construction lock
            await lockManager.lockAlbumItemDatabase(false)
              .then(() => { })
              .catch((e) => {
                logger.error('Failed to lockManager.lockAlbumItemDatabase(unlock)', e)
              });
          }
          holder.release();
        }
      }

      window.addEventListener('drop', (e) => {
        if (e.dataTransfer.getData('application/json')) {
          let droppedData = JSON.parse(e.dataTransfer.getData('application/json'));
          if (droppedData.mode === "fromSortout") {
            fromSortOutDrop(e, droppedData.photoInfo);
          } else if (droppedData.mode === "photo") {
            fromAlbumDrop(e, droppedData.albumId, droppedData.frames);
          }
        } else {
          fromOutsideDrop(e);
        }
      });

      logger.trace('event listener load: register event listeners');
      const KEY_CODES = {
        DEL: 46,
        INSERT: 45,
        ENTER: 13,
        HOME: 36,
        END: 35,
        SPACE: 32,
        UP: 38,
        LEFT: 37,
        DOWN: 40,
        RIGHT: 39,
        ESC: 27,
        TAB: 9,
        F1: 112,
      };
      $(document).on('mousewheel', function (e) {
        if (e.originalEvent.wheelDelta > 0) {
          //up wheel code
          moveMainSelectedAlbumLeft();
        }
        else {
          //down wheel code
          moveMainSelectedAlbumRight();
        }
      });
      function moveMainSelectedAlbumLeft() {
        const albumItems =
          Array.from(document.querySelectorAll('.album_spine, .album_box'));
        if (selectedAlbums.length === 0) {
          selectedAlbums = [albumItems[0]];
          addSelectedMark(selectedAlbums[0]);
        } else {
          removeSelectedMark(selectedAlbums[0]);
          let mainAlbumIndex = albumItems.indexOf(selectedAlbums[0]);
          if (mainAlbumIndex > 0) {
            --mainAlbumIndex;
          }
          selectedAlbums[0] = albumItems[mainAlbumIndex];
          addSelectedMark(selectedAlbums[0]);
        }
        $(selectedAlbums[0]).trigger('onmouseover');
        const rect = selectedAlbums[0].getBoundingClientRect();
        let left = $('.left-book');
        if (!(
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        ) && left[0].style.display != 'none') document.querySelector('.comcomment > .left-book').click();
      }
      function moveMainSelectedAlbumRight() {
        const albumItems =
          Array.from(document.querySelectorAll('.album_spine, .album_box'));
        if (!selectedAlbums.length === 0) {
          selectedAlbums = [albumItems[albumItems.length - 1]];
          addSelectedMark(selectedAlbums[0]);
        } else {
          removeSelectedMark(selectedAlbums[0]);
          let mainAlbumIndex = albumItems.indexOf(selectedAlbums[0]);
          if (mainAlbumIndex < albumItems.length - 1) {
            mainAlbumIndex++;
          }
          selectedAlbums[0] = albumItems[mainAlbumIndex];
          addSelectedMark(selectedAlbums[0]);
        }
        $(selectedAlbums[0]).trigger('onmouseover');
        const rect = selectedAlbums[0].getBoundingClientRect();
        let right = $('.right-book');
        if (!(
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth - 20 || document.documentElement.clientWidth - 20)
        ) || albumItems[albumItems.length - 1] == selectedAlbums[0]) {
          if (right[0].style.display != 'none') document.querySelector('.comcomment > .right-book').click();
        }
      }
      document.onkeydown = function (evt) {
        if (document.querySelector('div#loading-overlay').style.display === 'block') return;
        switch (evt.keyCode) {
          case KEY_CODES.DEL:
            handleDeletePressed();
            break;
          case KEY_CODES.INSERT:
            createAlbum();
            break;
          case KEY_CODES.ENTER:
            handleEnterPressed();
            break;
          case KEY_CODES.HOME:
            moveMainSelectedAlbumStart();
            break;
          case KEY_CODES.END:
            moveMainSelectedAlbumEnd();
            break;
          case KEY_CODES.SPACE:
            dispatchSpacePressed();
            break;
          case KEY_CODES.UP:
          case KEY_CODES.LEFT:
            moveMainSelectedAlbumLeft();
            break;
          case KEY_CODES.DOWN:
          case KEY_CODES.RIGHT:
            moveMainSelectedAlbumRight();
            break;
          case KEY_CODES.ESC:
            handleEscPressed();
            break;
          case KEY_CODES.TAB:
            let instances = AlbumWindowSet.getAll(ctx.constructionId);
            if (instances.length > 0) {
              instances[0].showAndFocus();
            }
            break;
          case KEY_CODES.F1:
            htmlOpener.openManual();
            break;
        }
        if (evt.ctrlKey && evt.code === "KeyN") {
          createAlbum();
        }
        if (evt.ctrlKey && evt.code === "KeyD") {
          handleDeletePressed();
        }
        if (evt.ctrlKey && evt.code === "KeyM") {
          $('#program-setting-button > img').click();
        }
        if (evt.ctrlKey && evt.code === "KeyP") {
          openPrintPreviewWindow();
        }
        async function createAlbum() {
          disableUserActions();
          try {
            if (await checkSharedLock(ctx.constructionId)) {
              return;
            }
            await settingsOperation.createAlbum(
              remote.getCurrentWindow(),
              { constructionId: ctx.constructionId, bookrackId: ctx.bookrackId });
          } catch (e) {
            console.log(e);
          } finally {
            enableUserActions();
          }
        }
        async function handleDeletePressed() {
          disableUserActions();
          if (selectedAlbums.length === 0) return;
          if (await checkSharedLock(ctx.constructionId)) {
          enableUserActions();
            return;
          }
          if (selectedAlbums[0].classList.contains('album_box')) {
            await goyoDialog.showWarningMessageDialog(
              remote.getCurrentWindow(),
              'アルバムの削除',
              'BOX未展開でのアルバム削除は行なえません。\n' +
              'BOX展開後、アルバムを選択してから行なってください。',
              'OK',
            );
          } else {
            const albumIds = selectedAlbums.map(album => album.data.id);
            try {
              if (await checkSharedLock(ctx.constructionId)) {
                return;
              }
              let bookrackItems = (await bookrackAccessor.getBookrackItems(ctx.constructionId)).bookrackItems;
              await settingsOperation.deleteAlbum(
                remote.getCurrentWindow(),
                { constructionId: ctx.constructionId, bookrackId: ctx.bookrackId, albumIds: albumIds, bookrackItems: bookrackItems});
            } catch (e) {
              console.log(e);
              logger.error('handleDeletePressed : Faild to delete album', e);
            } finally {
              enableUserActions();
            }
          }
          // await deleteAllEmptyBoxes();
          enableUserActions();
        }
        async function handleEnterPressed() {
          const mainAlbum = selectedAlbums[0];
          if (mainAlbum) {
            if (mainAlbum.classList.contains('album_box')) {
              removeSelectedMark(mainAlbum);
              const expandedBox = expandBox.call(mainAlbum);
              selectedAlbums[0] = expandedBox.querySelector('.album_spine');
              addSelectedMark(selectedAlbums[0]);
            } else {
              viewAlbumSpine(mainAlbum);
            }
          }
        }
        async function dispatchSpacePressed() {
          const event = new Event('space-keydown');
          document
            .querySelectorAll(
              '.album_box, .album_spine, .footer-album-box, #bookend, .album-tray')
            .forEach((elem) => {
              elem.dispatchEvent(event);
            });

          window.dispatchEvent(event);
        }
        async function viewAlbumSpine(albumSpine) {
          let showShadowAfterView = (albumId) => {
            document.querySelectorAll('.album_spine').forEach((elem) => {
              if (elem.data.id === albumId) {
                elem.querySelector('.shadow').style.width = '100%';
              }
            });
          };

          let hideShadowAfterView = (albumId) => {
            document.querySelectorAll('.album_spine').forEach((elem) => {
              if (elem.data.id === albumId) {
                elem.querySelector('.shadow').style.width = 0;
              }
            });
          };

          let _closeAfterView = (albumId) => {
            hideShadowAfterView(albumId);
          };
          let _openAfterView = (albumId) => {
            showShadowAfterView(albumId);
          };
          var albumId = albumSpine.data.id;
          if (albumSpine.data.opened) {
            AlbumWindowSet.close(ctx.constructionId, albumSpine.data.id);
            albumSpine.data.opened = false;
            _closeAfterView(albumId);
          } else {
            if (AlbumWindowSet.get(ctx.constructionId, albumSpine.data.id)) return;
            try {
              let view =
                AlbumWindowSet.open(ctx.constructionId, albumSpine.data.id);
              view.on('closed', () => {
                albumSpine.data.opened = false;
                _closeAfterView(albumId);
              });
            view.once('failed', () => {
              albumSpine.data.opened = false;
              goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
            });
              albumSpine.data.opened = true;
              _openAfterView(albumId);
            } catch (e) {
              await goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
            }
          }
        }
        function moveMainSelectedAlbumStart() {
          const albumItems =
            Array.from(document.querySelectorAll('.album_spine, .album_box'));
          if (selectedAlbums.length !== 0) {
            removeSelectedMark(selectedAlbums[0]);
          }
          selectedAlbums[0] = albumItems[0];
          addSelectedMark(selectedAlbums[0]);
          $(selectedAlbums[0]).trigger('onmouseover');
          for (let i = 0; i < albumItems.length; i++)
            moveMainSelectedAlbumLeft();
        }
        function moveMainSelectedAlbumEnd() {
          const albumItems =
            Array.from(document.querySelectorAll('.album_spine, .album_box'));
          if (selectedAlbums.length !== 0) {
            removeSelectedMark(selectedAlbums[0]);
          }
          selectedAlbums[0] = albumItems[albumItems.length - 1];
          addSelectedMark(selectedAlbums[0]);
          $(selectedAlbums[0]).trigger('onmouseover');
          for (let i = 0; i < albumItems.length; i++)
            moveMainSelectedAlbumRight();
        }
        async function handleEscPressed() {
          let result = await goyoDialog.showSimpleBinaryQuestionDialog(
            remote.getCurrentWindow(), 
            goyoAppDefaults.DIALOG_TITLE,
            '終了してよろしいですか？', 
            'はい(Y)', 'いいえ(N)', false);
          if (result) {
            window.close();
          }
        }
        async function openPrintPreviewWindow() {
          let selectedAlbumId;
          if (selectedAlbums.length === 0) return;
          if (selectedAlbums[0].classList.contains('album_box')) {
            selectedAlbumId = selectedAlbums[0].data.children[0].bookrackItemId;
          } else {
            selectedAlbumId = selectedAlbums[0].data.id;
          }
          ctx.albumInformation = JSON.parse(JSON.stringify(await bookrackAccessor.getAlbumDetail(ctx.constructionId, selectedAlbumId)));
          let sentence = ctx.albumInformation.albumDetail.albumSettings.sentence;
          let textMode = sentence.displayType === 0 ? 'photo_sentence' : 'photo_information';
          printOperation.startPreview(remote.getCurrentWindow(), ctx.constructionId, selectedAlbumId, textMode)
            .then((win) => {
              if (win) logger.info('open print preview');
            }).catch(e => logger.error('open print preview', e));
        }
      };

      logger.trace('event listener load: initializing start.');
      let constructions = await bookrackAccessor.getConstructions();
      let construction = constructions.constructions.find(c => c.constructionId === parseInt(constructionId));
      if (construction == null) {
        await goyoDialog.showWarningMessageDialog(
          remote.getCurrentWindow(), goyoAppDefaults.DIALOG_TITLE,
          '工事・本棚が見つかりません。工事一覧に戻ります。',
          'OK');
        viewMode.setNextMode(
          viewMode.MODE_CONSTRUCTION_SELECTION,
          { selectionMode: 'normal', defaultConstructionId: ctx.constructionId });
        window.close();
      }
      treeviewIconSetting(constructionId);

      logger.trace('event listener load: load ui parameters.');
      let bwParam = uiParam('bookrack_window', parseInt(constructionId));
      let { bookracks } = await bookrackAccessor.getBookracks(parseInt(constructionId));
      let bookrackId;
      if (params.has('bookrackId')) {
        bookrackId = parseInt(params.get('bookrackId'));
      } else {
        bookrackId = bwParam.lastShownBookrackId;
      }

      if (bookracks.every(b => b.bookrackItemId !== bookrackId)) {
        bookrackId = bookracks[0].bookrackItemId;
      }
      bwParam.lastShownBookrackId = bookrackId;

      logger.trace('event listener load: make construction data.');
      let constructionData = {
        constructionId: constructionId,
        bookrackId: bookrackId,
        constructionName: construction.constructionName,
        knackName: construction.knack.knackName,
        knackType: construction.knack.knackType,
        isSharedFolder:construction.isSharedFolder,
        dataFolder:construction.dataFolder
      };

      if (licenseManager.licenseType === 'trial') {
        let constructionDetail = await bookrackAccessor.getConstructionDetail(parseInt(constructionId), true);
        let dataFolderSize = constructionDetail.construction.dataFolderSize;
        if (dataFolderSize >= goyoAppDefaults.TRIAL_MAX_DATASIZE_IN_CONSTRUCTION) {
          await goyoDialog.showLicenseRestrictionDialog(remote.getCurrentWindow(), 6);  
        }
      }
      await initialize(constructionData);
      if (params.has('albumId')) {
        let albumId = parseInt(params.get('albumId'));
        let view = AlbumWindowSet.open(parseInt(constructionId), albumId, null, 0);
      }
      
      logger.trace('event listener load: menu icon setting.');
      menuIconSetting().catch(e => console.error(e));

      console.log(`initialize time: ${Date.now() - startTime}`);

      if (forPreview === 'true') {
        document
          .querySelectorAll(
            '#bookrack_outer, .bookrack-header, .titlebar, .left-outer, .right-outer, .album-tray, .album_box, .album_spine, .album_box_expanded')
          .forEach((elem) => {
            elem.classList.add('webview');
          });
      } else {
        if (goyoWebInfo.updateExists()) {
          //blick info_icon
          let times = 20;
          let icon = document.querySelector('#show-information-button > img');
          let interval = setInterval(function () {
            times--;
            if (icon.src.indexOf('red') > -1) {
              icon.src = 'images/menuicon_7.png';
            } else {
              icon.src = 'images/menuicon_7_red.png';
            }
            if (times === 0) {
              clearInterval(interval);
            }
          }, 500);
          icon.addEventListener('click', function () {
            clearInterval(interval);
            icon.src = 'images/menuicon_7.png';
          });
        }
      }

      let bookrackItemIds = getItemIds(ctx.bookrackItems);
      uiParam.removeUnnecessaryBookrackItemKeys(ctx.constructionId, bookrackItemIds);

      function getItemIds(bookrackItems) {
        let ids = [];
        for (let bookrackItem of bookrackItems) {
          ids.push(bookrackItem.bookrackItemId);
          if (bookrackItem.bookrackItems.length > 0) {
            ids.push(...getItemIds(bookrackItem.bookrackItems));
          }
        }
        return ids;
      }
      
    } catch (e) {
      logger.error(e); 
    }finally{
      windowEffecter.hideLoadingWindowIfTrueCallback(isNetworkConstruction)
    }
  }

  function selectFirstBookrackItem() {
    logger.trace('selectFirstBookrackItem(): begin');
    let bookrackItem = document.querySelector('.album_box, .album_spine');
    if (bookrackItem) {
      bookrackItem.dispatchEvent(new Event('mouseenter'));
      bookrackItem.classList.remove('mouse-hover-element');
    }
    logger.trace('selectFirstBookrackItem(): end');
  }

  function eventSetting() {
    // BookrackSpace add event Listener
    let bookrackSpace = document.getElementById('bookrack-space');
    bookrackSpace.addEventListener('click', onBookendClick);

    // bookend add event listener
    let bookend = document.getElementById('bookend');
    bookend.addEventListener('click', onBookendClick);

    let albumsToSelect = getAlbumsToSelect();

    // Add mouse events to albums
    albumsToSelect.forEach((album) => {
      addAlbumSpineMouseHanlder(album);
    });
  }

  function addAlbumSpineMouseHanlder(albumSpine) {
    albumSpine.addEventListener(
      'mouseenter', (e) => onAlbumMouseEnter(albumSpine, e));
    albumSpine.addEventListener('click', (e) => onAlbumMouseClick(albumSpine, e));
  }

  function boxExpandedEventSetting(boxExpanded) {
    let albums = boxExpanded.childNodes;

    albums.forEach((album) => {
      if ($(album).hasClass('album_spine')) {
        album.addEventListener('mouseenter', (e) => onAlbumMouseEnter(album, e));
        album.addEventListener('click', (e) => onAlbumMouseClick(album, e));
      }
    });
  }
  function boxCollapsedEventSetting(boxCollapse) {
    boxCollapse.addEventListener(
      'mouseenter', (e) => onAlbumMouseEnter(boxCollapse, e));
    boxCollapse.addEventListener(
      'click', (e) => onAlbumMouseClick(boxCollapse, e));
  }

  let selectedAlbums = [];
  function onAlbumMouseEnter(album, event) {
    if (event.ctrlKey || event.shiftKey) {
      // do nothing
    } else if (selectedAlbums.length > 1) {
      // do nothing
    } else if (document.$moveItem) {
      // do nothing
    } else {
      $('.selected_album_main_mark').removeClass('selected_album_main_mark');
      $('.selected_album_sub_mark').removeClass('selected_album_sub_mark');
      removeSelectedMark(selectedAlbums[0]);
      selectedAlbums = [album];
      addSelectedMark(album);
    }
  }

  function onAlbumMouseClick(album, event) {
    logger.trace('onAlbumMouseClick(): begin');
    event.preventDefault();
    if (event.ctrlKey) {
      if (selectedAlbums.includes(album)) {
        if (album !== selectedAlbums[0]) {
          selectedAlbums.splice(selectedAlbums.indexOf(album), 1);
          removeSelectedMark(album);
        }
      } else {
        addSelectedMark(album);
        selectedAlbums.push(album);
      }
    } else if (event.shiftKey) {
      if (selectedAlbums[0]) {
        const mainAlbum = selectedAlbums[0];
        const allAlbums = Array.from(getAlbumsToSelect());
        let startIndex = allAlbums.indexOf(mainAlbum);
        let endIndex = allAlbums.indexOf(album);
        if (startIndex > endIndex) {
          [startIndex, endIndex] = [endIndex, startIndex];
        }
        clearSelectedAlbums(3);
        selectedAlbums.push(mainAlbum);
        addSelectedMark(mainAlbum);
        allAlbums.forEach(album => {
          const albumIndex = allAlbums.indexOf(album);
          if (albumIndex <= endIndex && albumIndex >= startIndex &&
            album !== mainAlbum) {
            selectedAlbums.push(album);
            addSelectedMark(album);
          }
        });
      } else {
        selectedAlbums.push(album);
        addSelectedMark(album);
      }
    } else {
      clearSelectedAlbums(1, album);
    }
    logger.trace('onAlbumMouseClick(): end');
  }

  /*
   * case 1 : clear all and keep new selected album
   * case 2 : clear all sub and keep main selected album
   * case 3 : clear all sub and main selected album
   */
  function clearSelectedAlbums(key, album = null) {
    switch (key) {
      case 1:
        selectedAlbums.forEach((album) => {
          album.className =
            album.className.replace(' selected_album_main_mark', '');
          album.className =
            album.className.replace(' selected_album_sub_mark', '');
        });
        selectedAlbums = [album];
        addSelectedMark(album);
        break;
      case 2:
        selectedAlbums.forEach((album) => {
          if (album) {
            album.className =
              album.className.replace(' selected_album_sub_mark', '');
          }
        });
        selectedAlbums = [selectedAlbums[0]];
        break;
      case 3:
        selectedAlbums.forEach((album) => {
          album.className =
            album.className.replace(' selected_album_main_mark', '');
          album.className =
            album.className.replace(' selected_album_sub_mark', '');
        });
        selectedAlbums = [];
        break;

      default:
        break;
    }
  }

  function onBookendClick() {
    clearSelectedAlbums(2);
  }

  function addSelectedMark(album) {
    if (!album) return;
    if (album === selectedAlbums[0]) {
      if (album.classList.contains('album_box_expanded') || album.classList.contains('album-tray')) {
        album = album.querySelector('.bookrack-item');
      }
      album.classList.add('selected_album_main_mark');
      album.onmouseover();
    } else {
      album.classList.add('selected_album_sub_mark');
    }
  }

  function getWritableCoordinate(album) {
    let coordinate = album.getBoundingClientRect();
    let writableCoordinate = {
      width: coordinate.width,
      height: coordinate.height,
      top: coordinate.top,
      left: coordinate.left
    };
    return writableCoordinate;
  }

  function removeSelectedMark(album) {
    if (!album) return;
    if (selectedAlbums.indexOf(album) === 0) {
      album.className = album.className.replace(' selected_album_main_mark', '');
    } else {
      album.className = album.className.replace(' selected_album_sub_mark', '');
    }
  }

  function getAlbumsToSelect() {
    selectedAlbums.forEach((album) => removeSelectedMark(album));
    selectedAlbums = [];
    return document.querySelectorAll('.album_box, .album_spine');
  }

  //$(document).ready(function () {
  $(document).ready(() => {
    onreadyInitialize();
    onloadInitialize()
      .catch(e => console.error(e));
  });
  function onreadyInitialize() {
    let startTime = Date.now();

    if (logger.level >= 5) {
      window.addEventListener('click', (evt) => {
        let elem = evt.target.outerHTML.replace('\n', ' ').substring(0,100);
        logger.trace(`click: (${evt.clientX}, ${evt.clientY}) ${elem}`);
      }, true);
      window.addEventListener('contextmenu', (evt) => {
        let elem = evt.target.outerHTML.replace('\n', ' ').substring(0,100);
        logger.trace(`contextmenu: (${evt.clientX}, ${evt.clientY}) ${elem}`);
      }, true);
    }

    logger.trace('document ready listener: begin');
    $(document).on(
      'mousedown', '.album-tray, .album_box, .album_spine, .album_box_expanded',
      (e) => {
        //select and drag multi album
        if (e.ctrlKey === false && selectedAlbums.length > 1 && e.which === 1 && e.shiftKey === false) {
          let $target = $(e.target);
          if ($target.parents('.album_spine').length > 0)
            $target = $target.parents('.album_spine');
          if ($target.parents('.album_box').length > 0)
            $target = $target.parents('.album_box');
          if ($target.parents('.album_box_expanded').length > 0)
            $target = $target.parents('.album_box_expanded');
          selectedAlbums.forEach((album) => removeSelectedMark(album));
          selectedAlbums = [$target[0]];
          addSelectedMark($target[0]);
          e.stopPropagation();
          return;
          //end drag multi album
        }
        if (e.ctrlKey === false && e.which === 1 && e.shiftKey === false) {
          let $target = $(e.target);
          if ($target.hasClass('album_spine') ||
            $target.parents('.album_spine').length > 0) {
            document.$moveItem = $target.parents('.album_spine').length > 0 ?
              $($target.parents('.album_spine')[0]) :
              $target;
          } else if (
            $target.hasClass('album_box') ||
            $target.parents('.album_box').length > 0) {
            document.$moveItem = $target.parents('.album_box').length > 0 ?
              $($target.parents('.album_box')[0]) :
              $target;
          } else if (
            $target.hasClass('album_box_expanded') ||
            $target.parents('.album_box_expanded').length > 0) {
            document.$moveItem =
              $target.parents('.album_box_expanded').length > 0 ?
                $($target.parents('.album_box_expanded')[0]) :
                $target;
          } else if (
            $target.hasClass('album-tray') ||
            $target.parents('.album-tray').length > 0) {
            document.$moveItem = $target.parents('.album-tray').length > 0 ?
              $($(e.target).parents('.album-tray')[0]) :
              $target;
          }
        }
      });
    $(document).on('mousemove', '#bookrack_outer', (e) => {
      if (e.ctrlKey === false && document.$moveItem && e.which === 1) {
        let $target = $(e.target);
        $target = $target.parents('[data-id]').length > 0 ?
          $target.parents('[data-id]')[0] :
          $target;
        if ($target[0] !== document.$moveItem[0]) {
          $('#bookrack_outer, .left-outer, .right-outer, .album-tray, .album_box, .album_spine, .album_box_expanded')
            .css(
              'cursor',
              'url(../common/images/mouse/move.png) 15 15,-webkit-grabbing');
          document.$moveItem.css('cursor', '');
          document.movingItem = true;
        } else {
          delete document.movingItem;
        }
      } else {
        $('#bookrack_outer, .left-outer, .right-outer, .album-tray, .album_box, .album_spine, .album_box_expanded')
          .css('cursor', '');
      }
    });
    $(document).on('mouseleave', '#bookrack_outer', (e) => {
      e.preventDefault();
      delete document.$moveItem;
      delete document.movingItem;
    });
    $(document).on('mouseup', '#bookrack_outer', (e) => {
      if (e.ctrlKey === false && document.movingItem === true && e.which === 1) {
        let $target = $(e.target);
        if ($target.hasClass('left-outer')) {
          return;
        }
        drop($target, e);
        delete document.movingItem;
      }
    });
    $(document).on('mouseup', (e) => {
      if (e.ctrlKey === false && document.movingItem === true && e.which === 1) {
        if (e.clientX <= 20) {
          let $els = $('#bookrack_outer [data-id]');
          if ($els.length) {
            let $target = $($els[0]);
            if ($target.hasClass('album-tray')) {
              $target = $target.find('.album-tray-bottom');
            } else if ($target.hasClass('album_box_expanded')) {
              $target = $target.find('.footer-album-box');
            }
            drop($target, e);
            delete document.movingItem;
          }
        } else if (e.clientX >= $(window).width()) {
          drop($('#bookrack-space'), e);
          delete document.movingItem;
        }
      }

      if (document.$moveItem) {
        delete document.$moveItem;
      }
      $('#bookrack_outer, .left-outer, .right-outer, .album-tray, .album_box, .album_spine, .album_box_expanded')
        .css('cursor', '');
    });

    $(document).on('mousedown', '#content1, .titlebar, .bookrack-header', (e) => {
      let widthChange = Math.abs(remote.getCurrentWindow().getSize()[0] - storeWindowSize.width);
      let heightChange = Math.abs(remote.getCurrentWindow().getSize()[1] - storeWindowSize.height)
      if (widthChange > 3 || heightChange > 3) {
        // if window size changed so small, we would not store new size
        storeWindowSize.width = remote.getCurrentWindow().getSize()[0];
        storeWindowSize.height = remote.getCurrentWindow().getSize()[1];
      }
      if (!cursorPos.getIsMenuIcon()) {
        cursorPos.setMouseDown(true);
        cursorPos.setCurrsorAppPos(e.clientX, e.clientY);
        changeCursorOnIcon();
      }
    });
    $(document).on('mousedown', '.open-treeview-window', (e) => {
      cursorPos.setIsMenuIcon(true);
    });
    $('img').on('mousedown', (e)=>{
      cursorPos.setIsMenuIcon(true);
    });
    $(document).on('mousemove', '#content1, .titlebar, .bookrack-header', (e) => {
      $('.bookrack-header').css('cursor', 'url(../common/images/mouse/move3.png) 13 2,-webkit-grab');
    })
    $(document).on('mousemove', (e) => {
      if (cursorPos.getMouseDown()) {
        let cursorScreenPos = electron.screen.getCursorScreenPoint();
        let win = remote.getCurrentWindow()
        let cursorAppPos = cursorPos.getCurrsorAppPos();
        // console.log("app: (x,y): ("+e.clientX+" "+e.clientY+")--screen (x,y):("+cursorScreenPos.x+","+cursorScreenPos.y+")");
        let postionX = cursorScreenPos.x - cursorAppPos.x;
        let postionY = cursorScreenPos.y - cursorAppPos.y;
        // win.setPosition(postionX, postionY);      
        remote.getCurrentWindow().setBounds({
          width: storeWindowSize.width,
          height: storeWindowSize.height,
          x: postionX,
          y: postionY
        });
      }
    });
    $(document).on('mouseup', (e) => {
      if (cursorPos.getIsMenuIcon()) {
        cursorPos.setIsMenuIcon(false);
      }
      if (cursorPos.getMouseDown()) {
        cursorPos.setMouseDown(false);
        changeCursorOnIcon();
      }
    });
    logger.trace('document ready listener: finished registering listeners.');

    let titleLogo = document.getElementById('titlelogo');
    if(licenseManager.licenseType==='standard'){
      titleLogo.style.backgroundImage = "url('images/TitleLogo_S.png')";
    } else if (licenseManager.licenseType==='professional'){
      titleLogo.style.backgroundImage = "url('images/TitleLogo_P.png')";
    } else {
      titleLogo.style.backgroundImage = "url('images/TitleLogo_T.png')";
    }
    logger.trace('document ready listener: end.');
    console.log(`ready time: ${Date.now() - startTime}`);
  }

  async function drop($target, e) {
    let $moveItem = document.$moveItem;
    var isTargetMoveItemSame = (
      $target.parents('.album_spine')[0] == document.$moveItem[0] ||
      $target.parents('.album_box')[0] == document.$moveItem[0] ||
      $target.parents('.album_box_expanded')[0] == document.$moveItem[0] ||
      $target.parents('.album-tray')[0] == document.$moveItem[0] 
    );
    if (!isTargetMoveItemSame) {
      if (await checkSharedLock(ctx.constructionId))  return;
    }
    // After executing 'checkSharedLock ()', reset the document. $ moveItem because it will be gone.
    document.$moveItem = $moveItem;

    let $scrolledEl = $('.scrolled');
    let oldScrolledGIndex = 0;
    if ($scrolledEl.length > 0) {
      oldScrolledGIndex = $scrolledEl.attr('g-index');
    }

    //親のBOXと仕切りを取得しておく
    let oldPrarentBox = null;
    let oldParentTray = null
    if (document.$moveItem.parents('.album_box_expanded').length) {
      oldPrarentBox = document.$moveItem.parents('.album_box_expanded')[0];
    }
    if (document.$moveItem.parents('.album-tray').length) {
      oldParentTray = document.$moveItem.parents('.album-tray')[0];
    }

    if ($target.hasClass('album_spine') ||
      $target.parents('.album_spine').length > 0) {
      $target = $target.parents('.album_spine').length > 0 ?
        $($target.parents('.album_spine')[0]) :
        $target;
      dropToAlbum($target);
    } else if (
      $target.hasClass('album_box') ||
      $target.parents('.album_box').length > 0) {
      $target = $target.parents('.album_box').length > 0 ?
        $($target.parents('.album_box')[0]) :
        $target;
      dropToBox($target);
    } else if (
      $target.hasClass('album_box_expanded') ||
      $target.parents('.album_box_expanded').length > 0) {
      dropToExpandedBox($target);
    } else if (
      $target.hasClass('album-tray') ||
      $target.parents('.album-tray').length > 0) {
      dropToTray($target);
    } else {
      // move to end of bookrack
      if (document.$moveItem.hasClass('album_spine')) {
        removeFromChildrenOfBox();
      }

      $('#album_spine_list').append(document.$moveItem);
      document.$moveItem.attr(
        'parent-id',
        $('#album_spine_list').find('[data-id]').attr('parent-id'));
    }

    //スクロールしたアイテムがscrolledの場合
    if ($('.scrolled').length > 0 && document.$moveItem.length > 0 && $('.scrolled')[0].data.id === document.$moveItem[0].data.id) {
      //BOXから外に出して空になった場合
      if (oldPrarentBox != null && oldPrarentBox.data.children.length == 0) {
        //g-indexがずれるので一つ減らす
        oldScrolledGIndex = Math.max(0, parseInt(oldScrolledGIndex) - 1);
      }
      //仕切りから外に出して空になった場合
      if (oldParentTray != null) {
        let isAlbumExist = false;
        for ( let child of oldParentTray.children ) {
          if (child.classList.contains('album_spine')) {
            isAlbumExist = true;
            break;
          }
        }

        if (!isAlbumExist) {
          //g-indexがずれるので一つ減らす
          oldScrolledGIndex = Math.max(0, parseInt(oldScrolledGIndex) - 1);
        }
      }
    }
    
    await updateBookrackItemOrder();
    await updateAlbumData();
    document.$moveItem = $moveItem;
    if (parseInt(document.$moveItem.attr('g-index')) < parseInt($target.attr('g-index'))) {
      if ($target.offset().left + $target.width() > e.clientX) {
        clearSelectedAlbums(1, $target[0]);
      }
    } else if (parseInt(document.$moveItem.attr('g-index')) > parseInt($target.attr('g-index'))) {
      if (document.$moveItem.offset().left + document.$moveItem.width() < e.clientX) {
        clearSelectedAlbums(1, $target[0]);
      } 
    }
    updateGIndex();
    document.querySelector('.selected_album_main_mark').onmouseover();
    updateBoxExpandWidth(document.querySelector('#album_spine_list'));
    $('.scrolled').removeClass('scrolled');
    $('[g-index="' + oldScrolledGIndex + '"]').addClass('scrolled');
    delete document.$moveItem;
    delete document.movingItem;
  }

  function dropToAlbum($target) {
    if (document.$moveItem.hasClass('album_spine')) {
      removeFromChildrenOfBox();
      moveSameLevel($target);
      if ($target.parents('.album_box_expanded').length) {
        moveToChildrenOfBox($($target.parents('.album_box_expanded')[0]));
      }
    } else if (
      document.$moveItem.hasClass('album_box') ||
      document.$moveItem.hasClass('album_box_expanded')) {
      if (!$('[data-id="' + $target.attr('parent-id') + '"]').length) {
        moveSameLevel($target);
      } else {
        if ($('[data-id="' + $target.attr('parent-id') + '"]')
          .hasClass('album-tray')) {
          moveSameLevel($target);
        } else {
          // parent is box
          let $parent = $($target.parents('[data-id]')[0]);
          // move to next parent
          moveSameLevel($parent);
        }
      }
    } else {
      if ($('[data-id="' + $target.attr('parent-id') + '"]').length === 0) {
        moveSameLevel($target);
      } else {
        let $parent = $($target.parents('[data-id]')[0]);
        if ($('[data-id="' + $target.attr('parent-id') + '"]')
          .hasClass('album-tray')) {
          // move to next parent
          moveSameLevel($parent);
        } else {
          // parent is box
          // if box no parent
          if ($('[data-id="' + $parent.attr('parent-id') + '"]').length === 0) {
            // move to next box
            moveSameLevel($parent);
          } else {
            if ($('[data-id="' + $parent.attr('parent-id') + '"]')
              .hasClass('album-tray')) {
              // if box has parent is tray
              let $grandparent = $($parent.parents('[data-id]')[0]);
              // move to next tray
              moveSameLevel($grandparent);
            } else {
              // move to next box
              moveSameLevel($parent);
            }
          }
        }
      }
    }
  }

  function dropToBox($target) {
    if (document.$moveItem.hasClass('album-tray') &&
      $('[data-id="' + $target.attr('parent-id') + '"]').length > 0) {
      let $parent = $($target.parents('[data-id]')[0]);
      moveSameLevel($parent);
    } else {
      if (document.$moveItem.hasClass('album_spine')) {
        removeFromChildrenOfBox();
      }
      moveSameLevel($target);
    }
  }

  function dropToExpandedBox($target) {
    if ($target.hasClass('album-box-border') ||
      $target.parents('.album-box-border').length) {
      let $boxTarget = $($target.parents('[data-id]')[0]);
      let $children = $boxTarget.find('[data-id]');
      if (document.$moveItem.hasClass('album_spine')) {
        removeFromChildrenOfBox();
        if ($target.index() === 0) {
          // move to first child of box
          moveBecomeChildren($boxTarget, $children);
        } else {
          // move to last child of box
          moveBecomeChildren($boxTarget, $children, false);
        }
        moveToChildrenOfBox($boxTarget);
      } else {
        if (document.$moveItem.hasClass('album_box') ||
          document.$moveItem.hasClass('album_box_expanded') ||
          (!document.$moveItem.hasClass('album-tray') &&
            $('[data-id="' + $boxTarget.attr('parent-id') + '"]').length)) {
          moveSameLevel($boxTarget);
        } else {
          let $parent = $($boxTarget.parents('[data-id]')[0]);
          moveSameLevel($parent);
        }
      }
    } else if (
      $target.hasClass('footer-album-box') ||
      $target.parents('.footer-album-box').length) {
      let $boxTarget = $($target.parents('[data-id]')[0]);
      dropToBox($boxTarget);
    }
  }

  function dropToTray($target) {
    let $trayTarget = $($target.parents('[data-id]')[0]);
    if ($target.hasClass('album-tray-left') ||
      $target.parents('.album-tray-left').length > 0) {
      // move to first child of tray
      let $children = $trayTarget.find('[data-id]');
      if (document.$moveItem.hasClass('album_spine') ||
        document.$moveItem.hasClass('album_box') ||
        document.$moveItem.hasClass('album_box_expanded')) {
        // 前からであれば仕切りの中、後ろからであれば仕切りの前。
        if (parseInt(document.$moveItem.attr('g-index')) > parseInt($trayTarget.attr('g-index'))) {
          moveSameLevel($trayTarget);
        }else{
          moveBecomeChildren($trayTarget, $children);
        }
      } else {
        // move item is tray
        moveSameLevel($trayTarget);
      }
    } else if (
      $target.hasClass('album-tray-right') ||
      $target.parents('.album-tray-right').length > 0) {
      // move to last child of tray
      let $children = $trayTarget.find('[data-id]');
      if (document.$moveItem.hasClass('album_spine') ||
        document.$moveItem.hasClass('album_box') ||
        document.$moveItem.hasClass('album_box_expanded')) {
        moveBecomeChildren($trayTarget, $children, false);
      } else {
        moveSameLevel($trayTarget);
      }
    } else if (
      $target.hasClass('album-tray-bottom') ||
      $target.parents('.album-tray-bottom').length > 0) {
      moveSameLevel($trayTarget);
    }
  }

  function moveBecomeChildren($parent, $children, isFirst = true) {
    if (isFirst === true) {
      if ($children.length > 0) {
        let $target = $($children[0]);
        document.$moveItem.insertAfter($target);
        document.$moveItem.attr('parent-id', $target.attr('parent-id'));
      } else {
        $parent.append(document.$moveItem);
      }
    } else {
      if ($children.length > 0) {
        let $target = $($children[$children.length - 1]);
        if ($target.parents('.album_box_expanded').length) {
          //仕切りの最後がBOXの場合
          dropToAlbum($target)
        } else {
          document.$moveItem.insertBefore($target);
          document.$moveItem.attr('parent-id', $target.attr('parent-id'));
        }
      } else {
        $parent.append(document.$moveItem);
      }
    }
  }

  function moveSameLevel($target) {
    if (parseInt(document.$moveItem.attr('g-index')) >
      parseInt($target.attr('g-index'))) {
      document.$moveItem.insertBefore($target);
    } else {
      document.$moveItem.insertAfter($target);
    }
    document.$moveItem.attr('parent-id', $target.attr('parent-id'));
  }

  function removeFromChildrenOfBox() {
    if (document.$moveItem.parents('.album_box_expanded').length) {
      let oldBoxParent = document.$moveItem.parents('.album_box_expanded')[0];
      oldBoxParent.data.children.splice(document.$moveItem.index() - 1, 1);
    }
  }

  function moveToChildrenOfBox($boxTarget) {
    $boxTarget[0].data.children.splice(
      document.$moveItem.index() - 1, 0,
      { bookrackItemId: parseInt(document.$moveItem.attr('data-id')) });
  }

  function updateGIndex() {
    let obj = $('#album_spine_list').find('[data-id]');
    let gIndex = 0;
    for (let i = 0; i < obj.length; i++) {
      $(obj[i]).attr('g-index', gIndex);
      if (obj[i].classList.contains('album_box') && obj[i].data && obj[i].data.bookrackItems) {
        gIndex += obj[i].data.bookrackItems.length;
      }
      gIndex++;
    }
  }

  function findBookrackItem(bookrackItemId, bookrackItems = null) {
    if (bookrackItems === null) {
      bookrackItems = ctx.bookrackItems;
    }
    if (Array.isArray(bookrackItems)) {
      for (let i = 0; i < bookrackItems.length; i++) {
        let found = findBookrackItem(bookrackItemId, bookrackItem[i]);
        if (found) {
          return found;
        }
      }
      return null;
    } else {
      if (bookrackItems.bookrackItemId === bookrackItemId) {
        return bookrackItems;
      } else {
        if (bookrackItems.bookrackItems) {
          return findBookrackItem(bookrackItemId, bookrackItems.bookrackItems);
        } else {
          return null;
        }
      }
    }
  }

  function resetScrolledElement() {
    const scrolled = $($('.scrolled')[0]);
    scrolled && scrolled.removeClass('scrolled');
    const sortables = $('.scrollable');
    const length = sortables.length;
    for (let i = 0; i < length; i++) {
      if (isInViewport(sortables[i])) {
        $(sortables[i]).addClass('scrolled');
        return;
      }
    }
  }

  function isInViewport(elem) {
    if (typeof jQuery === 'function' && elem instanceof jQuery) {
      elem = elem[0];
    }
    var rect = elem.getBoundingClientRect();
    return (
      rect.top >= 0 && rect.left >= 0 &&
      rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) &&
      rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth)
    );
  }

  async function updateBookrackItemOrder() {
    let constructionItemOrder = [];
    let bookrackItemOrder = buildBookrackItemOrder();
    for (let i = 0; i < ctx.bookrackItems.length; i++) {
      if (ctx.bookrackItems[i].bookrackItemId ===
        bookrackItemOrder.bookrackItemId) {
        constructionItemOrder.push(bookrackItemOrder);
      } else {
        constructionItemOrder.push(ctx.bookrackItems[i]);
      }
    }

    let result = await bookrackAccessor.updateBookrackItemOrder(
      ctx.constructionId, constructionItemOrder);
    if (result.hasOwnProperty('updateCount')) {
      $('.album_box_expanded').each(async function (i, elem) {
        if ($(elem).find('.album_spine').length === 0 && $(elem).is(':visible')) {
          $(elem).remove();
          await bookrackAccessor.deleteBookrackItem(
            ctx.constructionId, elem.data.id);
        }
      });
      $('.album-tray').each(async function (i, elem) {
        if ($(elem).find('.album_spine, .album_box').length === 0 &&
          $(elem).is(':visible')) {
          $(elem).remove();
          await bookrackAccessor.deleteBookrackItem(
            ctx.constructionId, elem.data.id);
        }
      });
    }
    try {
      let { bookrackItems } =
        await bookrackAccessor.getBookrackItems(ctx.constructionId);
      bookrackItems = JSON.parse(JSON.stringify(bookrackItems));
      let bookrackData =
        bookrackItems.find(u => u.bookrackItemId === ctx.bookrackId) ||
        bookrackItems[0];
      let updatedAlbums = getAlbumFromBookrackItem(bookrackData);
      ctx.boxes = getBoxFromBookrackItem(bookrackData);
      let firstBlockDiff = 0;
      let nextBlockDiff = 0;
      for (let updated of updatedAlbums) {
        let old = ctx.albums.find(a => a.bookrackItemId === updated.bookrackItemId);
        if (old && old.albumDetail) {
          updated.albumDetail = old.albumDetail;
          updated.albumDetailPromise = old.albumDetailPromise;
        }
      }
      //for (let i = 0; i < updatedAlbums.length; i++) {
      //  if (updatedAlbums[i].bookrackItemId === ctx.albums[i].bookrackItemId) {
      //    updatedAlbums[i].albumDetail = ctx.albums[i].albumDetail;
      //  } else {
      //    if (firstBlockDiff === 0) {
      //      firstBlockDiff ++;
      //      while (updatedAlbums[i].bookrackItemId !== ctx.albums[i + firstBlockDiff].bookrackItemId) {
      //        firstBlockDiff ++;
      //      }
      //    }
      //    if (ctx.albums[i + firstBlockDiff] && updatedAlbums[i].bookrackItemId === ctx.albums[i + firstBlockDiff].bookrackItemId) {
      //      updatedAlbums[i].albumDetail = ctx.albums[i + firstBlockDiff].albumDetail;
      //      nextBlockDiff ++;
      //    } else if (ctx.albums[i - nextBlockDiff] && updatedAlbums[i].bookrackItemId === ctx.albums[i - nextBlockDiff].bookrackItemId) {
      //      updatedAlbums[i].albumDetail = ctx.albums[i - nextBlockDiff].albumDetail;
      //    }
      //  }
      //}
      ensureLoadingAlbumDetails(updatedAlbums);
      ctx.albums = updatedAlbums;
    } catch (e) {
      console.error('bookrack-accessor failed: error=', e);
    }
  }

  function buildBookrackItemOrder($el = $('#album_spine_list')) {
    if ($el.attr('id') === 'album_spine_list') {
      let $childs = $el.children();
      if (!$childs.length) {
        return { bookrackItemId: null };
      }
      let returnData = {
        bookrackItemId: parseInt($($childs[0]).attr('parent-id')),
        bookrackItems: []
      };
      for (let i = 0; i < $childs.length; i++) {
        returnData.bookrackItems.push(buildBookrackItemOrder($($childs[i])));
      }
      return returnData;
    } else if ($el.hasClass('album_spine')) {
      let displayNumber = $el.index();
      if (!$el.parents('.album-tray').length) {
        displayNumber++;
      }
      return {
        bookrackItemId: parseInt($el.attr('data-id')),
        displayNumber: displayNumber
      };
    } else if ($el.hasClass('album_box_expanded') || $el.hasClass('album_box')) {
      let displayNumber = $el.index();
      if (!$el.parents('.album-tray').length) {
        displayNumber++;
      }
      let bookrackItems = $el[0].data.children;
      for (let i = 0; i < bookrackItems.length; i++) {
        bookrackItems[i].displayNumber = i + 1;
      }
      return {
        bookrackItemId: parseInt($el.attr('data-id')),
        displayNumber: displayNumber,
        bookrackItems: bookrackItems
      };
    } else if ($el.hasClass('album-tray')) {
      let returnData = {
        bookrackItemId: parseInt($el.attr('data-id')),
        displayNumber: $el.index(),
        bookrackItems: []
      };
      let $childs = $el.children();
      for (let i = 0; i < $childs.length; i++) {
        if (!$($childs[i]).hasClass('album-tray-left') &&
          !$($childs[i]).hasClass('album-tray-right') &&
          !$($childs[i]).hasClass('album-tray-bottom')) {
          returnData.bookrackItems.push(buildBookrackItemOrder($($childs[i])));
        }
      }
      return returnData;
    }
  }

  async function deleteAllEmptyBoxes(bookrackItems) {
    const boxes = Array.from(document.querySelectorAll('.album_box_expanded, .album_box'));
    if (boxes.length === 0) return;
    // const emptyBoxes = boxes.filter(async (box) => (await bookrackAccessor.findBookrackItem(box.data.id,bookrackItems).length === 0));
    let emptyBoxes = [];
    for (const box of boxes) {
      let boxData = (await bookrackAccessor.findBookrackItem(box.data.id,bookrackItems));
      if(boxData.bookrackItems.length === 0) {
        emptyBoxes.push(box);
      }
    }
    for (const emptyBox of emptyBoxes) {
      await bookrackAccessor.deleteBookrackItem(ctx.constructionId, emptyBox.data.id);
      delete emptyBox.parentNode.removeChild(emptyBox);
    }
  }
  async function deleteAllEmptyTrays() {
    const { bookrackItems } = await bookrackAccessor.getBookrackItems(ctx.constructionId);
    const trays = Array.from(document.querySelectorAll('.album-tray'));
    if (trays.length === 0) return;
    let emptyTrays = [];
    for (const tray of trays) {
      let trayData = (await bookrackAccessor.findBookrackItem(tray.data.id,bookrackItems));
      if(trayData.bookrackItems.length === 0) {
        emptyTrays.push(tray);
      }
    }
    for (const emptyTray of emptyTrays) {
      await bookrackAccessor.deleteBookrackItem(ctx.constructionId, emptyTray.data.id);
      delete emptyTray.parentNode.removeChild(emptyTray);
    }
  }

  function setTextComcomtext(albumName, frameTotalCount, indexInConstruction, albumsLength) {
    let comcomtext = document.querySelector('.selected-album');
    if ($(comcomtext).data('name') !== albumName
          || $(comcomtext).data('count') !== frameTotalCount
          || $(comcomtext).data('index') !== indexInConstruction
          || $(comcomtext).data('albumsLength') !== albumsLength) {
      $(comcomtext).data("name", albumName);
      $(comcomtext).data("count", frameTotalCount);
      $(comcomtext).data("index", indexInConstruction);
      $(comcomtext).data("albumsLength", albumsLength);
      comcomtext.style.color = 'white';
      if (albumsLength) {
        //setTextComcomment for album
        document.querySelector('.selected-album').innerText = albumName + ' (' +
          frameTotalCount + 'フレーム、' +
          (indexInConstruction + 1) + '/' + albumsLength + '冊)';
      } else {
        //setTextComcomment for box
        document.querySelector('.selected-album').innerText = albumName + ' (' + frameTotalCount + '冊)';
      }
      setTimeout(() => {
        if ($(comcomtext)[0].scrollWidth > $(comcomtext).innerWidth()) {
          if (albumsLength) {
            //setTextComcomment for album
            document.querySelector('.selected-album').innerText = albumName.substr(0, 30) + '... (' +
              frameTotalCount + 'フレーム、' +
              indexInConstruction + '/' + albumsLength + '冊)';
          } else {
            //setTextComcomment for box
            document.querySelector('.selected-album').innerText = albumName.substr(0, 30) + '... (' + frameTotalCount + '冊)';
          }
        }
        comcomtext.style.color = 'black';
      }, 0);
    }
  }

  async function updateAlbumData(albums) {
    if (!albums) {
      albums = document.querySelectorAll('.album_spine, .album_box, .footer-album-box, .album-box-border');
    }
    let albumInBox = 0;
    let albumsShown = 0;
    for (let i = 0; i < albums.length; i++) {
      let elem = albums[i];
      if (elem.className.indexOf('box') > -1) {
        let box = ctx.boxes.find(u => u.bookrackItemId === elem.data.id);
        elem.data.albumCount = box.albumCount;
        if(elem.data.children.length > elem.data.bookrackItems.length) {
          // add new album
          for (let indexInBox = 0; indexInBox < elem.data.bookrackItems.length; indexInBox++) {
            if (elem.data.children[indexInBox].bookrackItemId !== elem.data.bookrackItems[indexInBox].bookrackItemId) {
              elem.data.bookrackItems.splice(indexInBox, 0, ctx.albums[albumsShown + albumInBox + indexInBox]);
              break;
            }
            if(indexInBox === elem.data.bookrackItems.length - 1) {
              elem.data.bookrackItems.splice(indexInBox + 1, 0, ctx.albums[albumsShown + albumInBox + indexInBox + 1]);
              break;
            }
          }
          elem.data.children = elem.data.bookrackItems.map(item => {
            return { bookrackItemId: item.bookrackItemId }
          })
        } else if(elem.data.children.length < elem.data.bookrackItems.length) {
          // remove album
          for (let indexInBox = 0; indexInBox < elem.data.children.length; indexInBox++) {
            if (elem.data.children[indexInBox].bookrackItemId !== elem.data.bookrackItems[indexInBox].bookrackItemId) {
              elem.data.bookrackItems.splice(indexInBox, 1);
              break;
            }
            if(indexInBox === elem.data.children.length - 1) {
              elem.data.bookrackItems.splice(indexInBox + 1, 1);
              break;
            }
          }
          elem.data.children = elem.data.bookrackItems.map(item => {
            return { bookrackItemId: item.bookrackItemId }
          })
        }
        if (elem.className.indexOf('album_box') > -1) {
          elem.data.indexOfFirstAlbum = albumsShown + albumInBox;
          albumInBox += elem.data.albumCount;
          elem.querySelector('span').innerText = elem.data.albumCount
        } else {
          elem.data.indexOfFirstAlbum = elem.parentElement.querySelector('.album_spine').data.indexInConstruction;
        }
        continue;
      }
      //elem.data.indexInConstruction = albumsShown + albumInBox;
      try {
        let indexAlbum = ctx.albums.findIndex(u => u.bookrackItemId === elem.data.id);
        elem.data.indexInConstruction = indexAlbum;
        elem.data.frameTotalCount = (await ctx.albums[elem.data.indexInConstruction].albumDetailPromise).frameTotalCount;
      } catch(e) {
        elem.data.frameTotalCount = 0;
      }
      elem.data.totalAlbums = ctx.albums.length;
      albumsShown ++; 
    }
  }

  function updateFooterBoxName(spineDiv, coverOption) {
    if (spineDiv.parentElement.classList.contains('album_box_expanded')
        && spineDiv.data.indexInConstruction === spineDiv.parentElement.data.indexOfFirstAlbum) {
      let footerElement = spineDiv.parentElement.querySelector('.footer-album-box');
      if (coverOption.font.fontName) {
        footerElement.querySelector('span').style.fontFamily = coverOption.font.fontName;
      }
      footerElement.querySelector('span').style.color = coverOption.font.fontColor || 'black';
      if (coverOption.font.fontSize != undefined) {
        let fontSize = cal(coverOption.font.fontSize, 12, 20);
        footerElement.querySelector('span').style.fontSize = `${fontSize}px`;
      }
      if (coverOption.font.fontWeight != undefined) {
        footerElement.querySelector('span').style.fontWeight = `${coverOption.font.fontWeight}`;
      }
      if (coverOption.font.fontStyle != undefined) {
        footerElement.querySelector('span').style.fontStyle = coverOption.font.fontStyle;
      }
      if (coverOption.font.textDecoration != undefined && coverOption.font.textDecoration.trim() != '') {
        footerElement.querySelector('span').style.textDecoration = coverOption.font.textDecoration.replace(/;/g, ' ');
      }
    }
  }

  function calculateDotTitle(title) {
    let maxLength = 30;
    let result = title.substr(0, maxLength) + "...";
    return result;
  }

  function calculateDot(divElem) {
    let elemDot = document.createElement('span');
    elemDot.innerText = '...';
    elemDot.className = 'dot';
    divElem.querySelectorAll('.comtext, .comtext2').forEach(elem => {
      if (elem.className.indexOf('comtext') > -1) {
        elemDot.style.color = '#eeeeee';
      } else {
        elemDot.style.color = 'white';
      }
      if (elem.querySelector('.dot')) {
        elem.querySelector('.dot').remove();
      }
      elem.appendChild(elemDot);
      setTimeout(() => {
        let dotHeight = parseFloat(window.getComputedStyle(elemDot, null).getPropertyValue('height'));
        let computedHeight = parseFloat(window.getComputedStyle(elem, null).getPropertyValue('height'));
        let totalChildHeight = 0;
        let childInsert;
        let height;
        for (const child of elem.children) {
          totalChildHeight += parseFloat(window.getComputedStyle(child, null).getPropertyValue('height'));
          let index = $(elem.children).index(child);
          if (!childInsert && totalChildHeight > computedHeight - dotHeight) {
            if ((computedHeight - totalChildHeight) < 20) {
              childInsert = elem.children[index - 1];
              height = (computedHeight - totalChildHeight + parseFloat(window.getComputedStyle(child, null).getPropertyValue('height')));
            } else {
              height = (computedHeight - totalChildHeight);
              childInsert = child;
            }
          }
          if (totalChildHeight > computedHeight) {
            elemDot.style.height = `${height}px`;
            elemDot.style.fontSize = `${height - 2}px`;
            elemDot.style.color = '';
            $(childInsert).after(elemDot);
            totalChildHeight = 0;
            break;
          }
        }
        if (totalChildHeight !== 0 && elem.querySelector('.dot')) {
          elem.querySelector('.dot').remove();
        }
      }, 0);
    })
  }

  async function openAlbumFromAfterCreated(constructionId, newAlbumId, frameIndex) {
    let albumSpineElement;
    let view = AlbumWindowSet.open(parseInt(constructionId), newAlbumId, frameIndex);
    document.querySelectorAll('.album_spine').forEach((elem) => {
      if (elem.data.id == newAlbumId) {
        albumSpineElement = elem;
        elem.dataset.id = elem.data.id;
      }
    });
    let showShadowAfterCreated = (albumId) => {
      if(albumSpineElement){
        albumSpineElement.querySelector('.shadow').style.width = '100%';
      }
    }

    let hideShadowAfterCreated = (albumId) => {
      if(albumSpineElement){
        albumSpineElement.querySelector('.shadow').style.width = 0;
      }
    }
    let _closeAfterCreated = (albumId) => {
      hideShadowAfterCreated(albumId);
    };
    let _openAfterCreated = (albumId) => {
      showShadowAfterCreated(albumId);
    };
    _openAfterCreated(newAlbumId);
    view.on('closed', () => {
      if (Array.isArray(newAlbumId)) {
        _closeAfterCreated(newAlbumId[0]);
      } else { _closeAfterCreated(newAlbumId); }
    });
    return view;
  }

  //Make file list from all of file in outside folder when dropping
  function makeFileList(files) {
    /*UPLOAD FILES HERE*/
    let allImageFiles = [];
    let dirs = Array.from(files).map(f =>
      f.path);
    for (let i = 0; i < dirs.length; i++) {
      if (fs.statSync(dirs[i]).isDirectory()) {
        allImageFiles.push(...getImageFileInDir(dirs[i]));
      }
      else {
        let ext = dirs[i].replace(/^.*\./g, '').toLowerCase();
        if (['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tpi'].includes(ext)) {
          allImageFiles.push(dirs[i]);
        }
      }
    }
    return allImageFiles;
  }

  // List all image files in a outside directory
  function getImageFileInDir(dir, filelist) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
      if (fs.statSync(dir + '/' + file).isDirectory()) {
        filelist = getImageFileInDir(dir + '/' + file, filelist);
      }
      else {
        let ext = file.replace(/^.*\./g, '').toLowerCase();
        if (['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tpi'].includes(ext)) {
          filelist.push(dir + '\\' + file);
        }
      }
    });
    return filelist;
  }

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
  
  async function checkSharedAlbumLock(constructionId, targetAlbumId) {
    let lockManager = null;
    try {
      // lock album
      lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
      return await lockManager.lockAlbum(targetAlbumId, true);
    } catch (e) {
      logger.error('Failed to lockManager', e);
      return false;
    }
  }

  async function checkSharedAlbumItemDBLock(constructionId) {
    let result = {"isLock": false, "lockManager": null};
    try {
      let lockManager = await lockFactory.makeLockManagerByConstructionId(constructionId);
      result.lockManager = lockManager;
      let isLockAlbumItemdb = await lockManager.lockAlbumItemDatabase(true)
      .then(() => { return true })
      .catch((e) => {
        logger.error('Failed to lockManager.lockAlbumItemDatabase(lock)', e);
        return false;
      });
      if (!isLockAlbumItemdb) {
        await goyoDialog.showConstructionLockBusyDialog(remote.getCurrentWindow());
        result.isLock = false;
        return result;
      }
    } catch (error) {
      logger.error('Failed to lockManager', e);
      result.isLock = false;
      return result;
    }
    result.isLock = true;
    return result;
  } 

  function removeIconDeliverable(){
    //deliverable data output button
    if (ctx.knackType === 8 || ctx.knackType === 9) {
      $('#deliverable-button').hide();
    } else {
      $('#deliverable-button').show();
    }
  }

  function changeCursorOnIcon(){
    let icon = document.querySelectorAll('.change_cursor');
    if(icon.length < 1){return;} 
    if(cursorPos.getMouseDown()){
      for(var i = 0; i <icon.length; i++){
        icon[i].classList.replace('goyo-cursor-mommy-finger','goyo-cursor-finger-five-custom');
      }
    }else{
      for(var i = 0; i <icon.length; i++){
        icon[i].classList.replace('goyo-cursor-finger-five-custom','goyo-cursor-mommy-finger');
      }
    }
  }
  // change cusor resize icon at the bottom and right side
  window.addEventListener('resize',(e)=>{
    $('.state').addClass('resizing');
  });
  window.addEventListener('mousemove',(e)=>{
    $('.state').removeClass('resizing');
  });
  function showConstructionList(){
    viewMode.setNextMode(
      viewMode.MODE_CONSTRUCTION_SELECTION,
      { selectionMode: 'normal', defaultConstructionId: ctx.constructionId });
    window.close();
  }
  async function sharedCheckThenRun(callback = ()=>{}){
    if(checkNetworkConstruction.isNetworkConstruction()){
      let isOffine = await checkNetworkConstruction.checkThenShowConsturctionList();
      if(!isOffine){
        await callback();
      }
    }else{
      await callback();
    }
  }
})();
async function checkNetworkConstructionInit(constructionId = 0,constructionDataPath = ''){
  await checkNetworkConstruction.initialize(constructionId,constructionDataPath);
}