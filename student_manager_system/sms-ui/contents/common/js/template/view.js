'use strict';
const {
  createAlbumPageManager
} = (function () {
  const { remote } = require('electron');
  const dateformat = require('dateformat');

  function path2Url(p, suppressCache, schema = 'file') {
    let suffix = (suppressCache) ? `?_=${Date.now()}` : '';
    let filePath = encodeURI(p.replace(/\\/g, '/'));
    filePath = filePath.replace(/\#/g, '\%23');
    return schema + `:///${filePath}${suffix}`;
  }

  function deepFreeze(o) {
    Object.freeze(o);
    for (let propKey in o) {
      let prop = o[propKey];
      if (!o.hasOwnProperty(propKey) || !(typeof prop === "object") || Object.isFrozen(prop)) {
        continue;
      }
      deepFreeze(prop);
    }
  }

  // Custom element '<goyo-headerfooter>' definition.
  function registerGoyoHeaderFooterElement(albumInfoManager) {
    let GoyoHeaderFooter = Object.create(HTMLElement.prototype);

    GoyoHeaderFooter.createdCallback = function () {
      let shadow = this.createShadowRoot();
      shadow.innerHTML = `
    <style>
    :host {
      position: absolute;
    }

    :host > div {
      width: 100%;
      height: 100%;
      position: absolute;
      overflow: hidden;
      padding: 0;
      font-family: Meiryo UI;
      display: flex;
      align-items: center;
      white-space: pre;
    }
    div.left {
      justify-content: flex-start;
    }
    div.center {
      justify-content: center;
    }
    div.right {
      justify-content: flex-end;
    }
    </style>
    <div class="left"></div>
    <div class="center"></div>
    <div class="right"></div>`;
    };
    GoyoHeaderFooter.attachedCallback = function() {
      this._tryApply();
    };
    GoyoHeaderFooter.detachedCallback = function() {};
    GoyoHeaderFooter.attributeChangedCallback = function (attrName, oldVal, newVal) {
      switch (attrName) {
        case 'rect':
          let values = JSON.parse(newVal);
          this.style.left = `${values.x/100}%`;
          this.style.top = `${values.y/100}%`;
          this.style.width = `${values.width/100}%`;
          this.style.height = `${values.height/100}%`;
          break;
        case 'fontsize':
          this.style.fontSize = `${newVal*100}%`;
          break;
        case 'type':
          this._tryApply();
          break;
        case 'side':
          this._tryApply();
          break;
        default:
          break;
      }
    };
    GoyoHeaderFooter.refresh = function() {
      this._tryApply();
    };
    GoyoHeaderFooter._tryApply = function() {
      let type = this.getAttribute('type');
      let side = this.getAttribute('side');
      if (!type || !side || !this.isConnected) return;

      // 25.4mm = 1inch = 72pt
      const KEYS = (albumInfoManager.flipHeaderSideInEvenPage && side==='right') ? ['right', 'center', 'left'] : ['left', 'center', 'right'];
      let nonble = albumInfoManager.nonble;
      let page = nonble.start + nonble.offset + 2*this.parentElement.getAttribute('spreadindex');
      page += (side==='right')? 1 : 0;

      if (type === 'header') {
        let headers = albumInfoManager.headers;
        let divs = this.shadowRoot.querySelectorAll('div');
        for (let i=0; i < KEYS.length; i++) {
          if (nonble.enable && nonble.position === `${KEYS[i]}header`) {
            divs[i].textContent = `${nonble.prefix}${page}`;
            divs[i].style.fontSize = `${20+(0.8*nonble.size)}%`;
          } else {
            divs[i].textContent = headers[KEYS[i]];
            divs[i].style.fontSize = `${20+(0.8*headers.size)}%`;
          }
        }
      } else if (type === 'footer') {
        let footers = albumInfoManager.footers;
        let divs = this.shadowRoot.querySelectorAll('div');
        for (let i=0; i < KEYS.length; i++) {
          if (nonble.enable && nonble.position === `${KEYS[i]}footer`) {
            divs[i].textContent = `${nonble.prefix}${page}`;
            divs[i].style.fontSize = `${20+(0.8*nonble.size)}%`;
          } else {
            divs[i].textContent = footers[KEYS[i]];
            divs[i].style.fontSize = `${20+(0.8*footers.size)}%`;
          }
        }
      } else {
      }
    };
    String.prototype.isRegistered = function() { 
      return document.createElement(this).constructor !== HTMLElement; 
    }
    let result = 'goyo-headerfooter'.isRegistered();
    if(result){
     //do nothing
    } else {
      document.registerElement('goyo-headerfooter', {
        prototype: GoyoHeaderFooter
      });
    }
  }


  async function createAlbumPageManager(
    layoutInfo,
    frameManager,
    albumInfoManager,
    actionManager,
    textFormatter,
    isValidPhotoInformation=()=>true,
    useThumbnail=false) {

    var template = JSON.parse(JSON.stringify(await layoutInfo.template));
    //var template = JSON.parse(await fse.readFile(templatePath));
    deepFreeze(template);

    //let formatter = new TextFrameFormatter(albumInfoManager, makePhotoInfoText);
    registerGoyoHeaderFooterElement(albumInfoManager);
    //registerGoyoPhotoFrameElement(layoutInfo.path, albumInfoManager, useThumbnail);
    //registerGoyoTextFrameElement(albumInfoManager, makePhotoInfoText, isValidPhotoInformation);

    //let GoyoTextFrame = registerGoyoTextFrameElement();
    console.log('set the formatter');
    GoyoTextFrame.formatter = textFormatter;
    GoyoTextFrame.photoInfoValidator = { checkValidity: isValidPhotoInformation, };

    class BlockElementSet {
      constructor(frameIndex, templateBlock) {
        this._elements = [];
        this._frameIndex = frameIndex;
        this._frame = null;
        this._templateBlock = templateBlock;
        this._changeFrameStateListener = () => {
          for (let domElement of this._elements) {
            domElement.applyFrame(this._frameIndex, this._frame);
          }
        };
        this._changeSelectedStateListener = () => {
          let state = this._frame.selectedState;
          if (albumInfoManager.showFocusBorder && state === Frame.SELECTED_AS_MAIN) {
            for (let elm of this._elements) {
              elm.setAttribute('selected', 'main');
            }
          } else if (albumInfoManager.showFocusBorder && state === Frame.SELECTED_AS_SUB) {
            for (let elm of this._elements) {
              elm.setAttribute('selected', 'sub');
            }
          } else if (state === Frame.SELECTED_AND_APPEAL) {
            for (let elm of this._elements) {
              elm.setAttribute('selected', 'appeal');
            }
          } else {
            for (let elm of this._elements) {
              elm.removeAttribute('selected');
            }
          }
        };
        this._mouseenter = (e) => actionManager.mouseenter(e, this._frameIndex, this._frame);
        this._mouseleave = (e) => actionManager.mouseleave(e, this._frameIndex, this._frame);
        this._click = (e) => actionManager.click(e, this._frameIndex, this._frame);
        this._dblclick = (e) => actionManager.dblclick(e, this._frameIndex, this._frame);
        this._dragstart = (e) => actionManager.dragstart(e, this._frameIndex, this._frame);
        this._dragenter = (e) => actionManager.dragenter(e, this._frameIndex, this._frame);
        this._dragover = (e) => actionManager.dragover(e, this._frameIndex, this._frame);
        this._dragleave = (e) => actionManager.dragleave(e, this._frameIndex, this._frame);
        this._drop = (e) => actionManager.drop(e, this._frameIndex, this._frame);
        this._dragend = (e) => actionManager.dragend(e, this._frameIndex, this._frame);
        this._contextmenu = (e) => actionManager.contextmenu(e, this._frameIndex, this._frame);
        this._texticonclick = (e) => actionManager.texticonclick(e, this._frameIndex, this._frame);
      }

      get domElements() {
        return this._elements;
      }

      makeElements(targetSide = 'all') {
        for (let tmplElem of this._templateBlock.elements) {
          if (5000 < tmplElem.rect.x && targetSide==='leftonly') continue;
          if (tmplElem.rect.x + tmplElem.rect.width < 5000 && targetSide==='rightonly') continue;

          let domElem;
          if (tmplElem.hasOwnProperty('image')) {
            // Make <goyo-photoframe>
            domElem = document.createElement('goyo-photoframe');
            domElem.setAttribute('valign', tmplElem.verticalAlign || 'middle');
            domElem.setAttribute('halign', tmplElem.horizontalAlign || 'center');
            domElem.setAttribute('scaletype', tmplElem.scaleType || 'infit');
            domElem.setAttribute('aspect', tmplElem.actualAspect);
            //domElem.setAttribute('fontsize', tmplElem.rect.width > tmplElem.rect.height ? tmplElem.rect.height : tmplElem.rect.width || '16');
            if (tmplElem.condition) {
              domElem.setAttribute('condition', tmplElem.condition);
            }
            if (useThumbnail) {
              domElem.setAttribute('use-thumbnail', 'true');
            } else if ((tmplElem.actualAspect > 1.25 && tmplElem.rect.width < 1350) ||
              (tmplElem.actualAspect < 1.25 && tmplElem.rect.height < 1440)) {
              domElem.setAttribute('use-thumbnail', 'true');
            }
          } else {
            // Make <goyo-textframe>
            domElem = document.createElement('goyo-textframe');
            domElem.setAttribute('draggable', 'true');
            domElem.setAttribute('valign', tmplElem.verticalAlign || 'left');
            domElem.setAttribute('halign', tmplElem.horizontalAlign || 'center');
            domElem.setAttribute('ruleline', tmplElem.ruleline || false);
            domElem.setAttribute('multiline', tmplElem.multiline || false);
            let fontsize = tmplElem.fontsize || albumInfoManager.defaultFont.fontSize;
            let lineHeightInch = fontsize / 72 * 1.1;
            domElem.setAttribute('fontsize', fontsize);
            if (tmplElem.realHeight > 0) {
              let lines = Math.floor(tmplElem.realHeight / 25.4 / lineHeightInch);
              domElem.setAttribute('lines', lines);
            } else {
              domElem.setAttribute('lines', 15);
            }
            domElem.setAttribute('format', tmplElem.textFormat);
            if (tmplElem.key) {
              domElem.setAttribute('key', tmplElem.key);
            }
            if (tmplElem.condition) {
              domElem.setAttribute('condition', tmplElem.condition);
            }
            if (template.matchKokubanTypes && template.matchKokubanTypes.length > 0) {
              domElem.setAttribute('match-kokuban-types', template.matchKokubanTypes.join(' '));
            }
          }

          domElem.style.position = 'absolute';
          domElem.style.left = `${tmplElem.rect.x/100}%`;
          domElem.style.top = `${tmplElem.rect.y/100}%`;
          domElem.style.width = `${tmplElem.rect.width/100}%`;
          domElem.style.height = `${tmplElem.rect.height/100}%`;

          // Set event listeners;
          domElem.onmouseenter = this._mouseenter;
          domElem.onmouseleave = this._mouseleave;
          domElem.onclick = this._click;
          domElem.ondblclick = this._dblclick;
          domElem.ondragstart = this._dragstart;
          domElem.ondragenter = this._dragenter;
          domElem.ondragover = this._dragover;
          domElem.ondragleave = this._dragleave;
          domElem.ondrop = this._drop;
          domElem.ondragend = this._dragend;
          domElem.oncontextmenu = this._contextmenu;
          domElem.addEventListener('text-icon-click', this._texticonclick);

          this._elements.push(domElem);
        }
      }

      applyFrame(frame) {
        if (this._frame) {
          this.unapplyFrame();
        }

        if (frame) {
          this._frame = frame;
          this._changeFrameStateListener();
          this._changeSelectedStateListener();

          this._frame.addListener('change-frame-state', this._changeFrameStateListener);
          this._frame.addListener('change-selected-state', this._changeSelectedStateListener);
        }
      }

      unapplyFrame() {
        this._frame.removeListener('change-frame-state', this._changeFrameStateListener);
        this._frame.removeListener('change-selected-state', this._changeSelectedStateListener);
        this._frame = null;
      }
    }

    function createLegacyHeaderFooterElements(template) {
      let lgHeaderFooterElems = [];
      if (template.hasOwnProperty('legacyHeaderFooterArea')) {
        for (let key of ['headerLeftPage', 'headerRightPage', 'footerLeftPage', 'footerRightPage']) {
          if (template.legacyHeaderFooterArea.hasOwnProperty(key)) {
            let domElem = document.createElement('goyo-headerfooter');
            domElem.setAttribute('rect', JSON.stringify(template.legacyHeaderFooterArea[key].rect));
            domElem.setAttribute('type', (key.startsWith('header')) ? 'header':'footer');
            domElem.setAttribute('side', (key.endsWith('LeftPage')) ? 'left':'right');
            domElem.setAttribute('fontsize', template.legacyHeaderFooterArea[key].fontsize);
            lgHeaderFooterElems.push(domElem);
          }
        }
      }
      return lgHeaderFooterElems;
    }

    function createAlbumSpread(spreadIndex) {
      let node = document.createElement('div');
      node.setAttribute('spreadindex', spreadIndex);
      node.classList.add('tmpl-spread');
      node.style.width = '100%';
      node.style.height = '100%';
      node.style.position = 'absolute';
      if (template.fontfamily) {
        node.style.fontFamily = template.fontfamily;
      } else {
        node.style.fontFamily = albumInfoManager.defaultFont.fontFamily;
        node.style.fontStyle = albumInfoManager.defaultFont.fontStyle;
        node.style.fontWeight = albumInfoManager.defaultFont.fontWeight;
      }

      //////////////////////////////////////////////
      // Private properties.
      //////////////////////////////////////////////
      let blocksInSpread = template.leftPageBlockCount + template.rightPageBlockCount;
      let startFrameIndex = spreadIndex * blocksInSpread;
      node._ready = false;
      node._blockElementSetList = [];
      node._nonBlockElements = [];

      node._applyFrames = function () {
        // Apply frame information to DOM and set listener for changing frame loging state.
        let frames = Array.from({
          length: blocksInSpread
        }).map((v, k) => frameManager.getFrameAt(startFrameIndex + k));
        for (let blockIdx = 0; blockIdx < blocksInSpread; blockIdx++) {
          let frame = frames[blockIdx];
          let bElemSet = this._blockElementSetList[blockIdx];
          bElemSet.applyFrame(frame);
        }
      };

      //////////////////////////////////////////////
      // Public methods
      //////////////////////////////////////////////
      node.makeElements = function(targetSide='all') {
        if (this.childElementCount > 0) return;

        // Create DOMs from template data without frame information.
        let df = document.createDocumentFragment();

        // Create DOMs for no-album-frame-related-elements(header, footer, page number or so).
        for (let tmplElem of template.elements) {
          if (5000 < tmplElem.rect.x && targetSide==='leftonly') continue;
          if (tmplElem.rect.x + tmplElem.rect.width < 5000 && targetSide==='rightonly') continue;

          let domElem;
          if (tmplElem.hasOwnProperty('image')) {
            domElem = document.createElement('goyo-photo');
            domElem.setAttribute('valign', tmplElem.verticalAlign || 'middle');
            domElem.setAttribute('halign', tmplElem.horizontalAlign || 'center');
            domElem.setAttribute('scaletype', tmplElem.scaleType || 'infit');
            domElem.setAttribute('src', path.join(layoutInfo.path, tmplElem.image));
          } else {
            domElem = document.createElement('goyo-normaltext');
            domElem.setAttribute('valign', tmplElem.verticalAlign || 'left');
            domElem.setAttribute('halign', tmplElem.horizontalAlign || 'center');
            domElem.setAttribute('ruleline', tmplElem.ruleline || false);
            domElem.setAttribute('multiline', tmplElem.multiline || false);
            domElem.setAttribute('lines', tmplElem.lines || '15');
            domElem.setAttribute('format', tmplElem.textFormat); // for refreshNonBlocks
            domElem.setText(textFormatter.format(tmplElem.textFormat, null, spreadIndex));
            domElem.style.fontSize = `${tmplElem.fontsize*100}%`;
          }
          domElem.style.position = 'absolute';
          domElem.style.left = `${tmplElem.rect.x/100}%`;
          domElem.style.top = `${tmplElem.rect.y/100}%`;
          domElem.style.width = `${tmplElem.rect.width/100}%`;
          domElem.style.height = `${tmplElem.rect.height/100}%`;

          if (domElem) {
            df.appendChild(domElem);
            this._nonBlockElements.push(domElem);
          }
        }

        // Create DOMs for legacy header footer.
        let lhfElements = createLegacyHeaderFooterElements(template);
        for (let elm of lhfElements) {
          df.appendChild(elm);
        }

        // Create DOMs for album-frame-related-elements.
        for (let i = 0; i < template.blocks.length; i++) {
          let bElemSet = new BlockElementSet(startFrameIndex + i, template.blocks[i]);
          bElemSet.makeElements(targetSide);
          node._blockElementSetList.push(bElemSet);
          for (let domElem of bElemSet.domElements) {
            df.appendChild(domElem);
          }
        }

        node.appendChild(df);
        node._applyFrames();
      };

      node.breakElements = function() {
        for (let bElemSet of this._blockElementSetList) {
          bElemSet.unapplyFrame();
        }
        this._nonBlockElements = [];
        this._blockElementSetList = [];
        node.textContent = '';
      };

      node.makeReady = function () {
        if (node._ready) {
          //return;
        }

        for (let elem of this.querySelectorAll('goyo-photoframe, goyo-textframe')) {
          elem.makeReady();
        }
        // createRuleLine(node);
        node._ready = true;
      };

      node.isReady = function () {
        return _ready;
      };

      node.changeDisplayText = function (type = 'T') {
        //node.setAttribute('text-mode', type);
      };

      node.getPhotoFramePosition = function (frameIndex) {
        let blockIndex = frameIndex - startFrameIndex;
        if (0 <= blockIndex && blockIndex < this._blockElementSetList.length) {
          let bElemSet = this._blockElementSetList[blockIndex];
          let photo = bElemSet._elements.find(elem => elem.localName === 'goyo-photoframe');
          return photo.getBoundingClientRect();
        } else {
          return null;
        }
      };

      node.refreshNonBlocks = function () {
        for (let child of this.children) {
          if (child.tagName === 'GOYO-HEADERFOOTER') {
            child.refresh();
          } else if (child.tagName === 'GOYO-NORMALTEXT') {
            let format = child.getAttribute('format');
            child.setText(textFormatter.format(format, null, spreadIndex));
          }
        }
      };

      //node.makeElements();
      return node;
    }

    class AlbumPageManager {
      constructor() {}

      get layoutWidth() {
        return 420.0 - template.defaultMargins.left - template.defaultMargins.right;
      }

      get layoutHeight() {
        return 297.0 - template.defaultMargins.top - template.defaultMargins.bottom;
      }

      get layoutWidthInPixel() {
        return this.layoutWidth / 25.4 * 96;
      }

      get cropAreaRatio() {
        let w = template.goyoAlbumAreaLeft.width + template.goyoAlbumAreaRight.width;
        let h = template.goyoAlbumAreaLeft.height;
        return [w / 10000, h / 10000];
      }

      //get layoutHeightInPixel() {
      //  return this.layoutHeight / 25.4 * 96;
      //}

      get defaultMargins() {
        return template.defaultMargins;
      }

      get leftPageBlockCount() {
        return template.leftPageBlockCount;
      }

      get rightPageBlockCount() {
        return template.rightPageBlockCount;
      }

      get spreadCount() {
        let blocksInSpread = this.leftPageBlockCount + this.rightPageBlockCount;
        return Math.ceil(frameManager.length / blocksInSpread);
      }

      createAlbumSpread(spreadIndex) {
        return createAlbumSpread(spreadIndex);
      }

      createAlbumViewCropper(spreadNode, side = 'left') {
        let cropRect = (side === 'left') ?
          template.goyoAlbumAreaLeft :
          template.goyoAlbumAreaRight;

        let widthScale = 10000 / cropRect.width;
        let heightScale = 10000 / cropRect.height;
        spreadNode.style.left = `${-cropRect.x*widthScale/100}%`;
        spreadNode.style.top = `${-cropRect.y*heightScale/100}%`;
        spreadNode.style.width = `${(widthScale)*100}%`;
        spreadNode.style.height = `${(heightScale)*100}%`;

        let cropDiv = document.createElement('div');
        cropDiv.appendChild(spreadNode);
        cropDiv.classList.add('tmpl-album-cropper');
        //cropDiv.style.width = '100%';
        //cropDiv.style.height = '100%';
        //cropDiv.style.position = 'absolute';
        return cropDiv;
      }

      async rotateTemplate(newLayoutInfo) {
        template = await newLayoutInfo.template;
        //template = JSON.parse(await fse.readFile(layoutInfo.templatePath));
        deepFreeze(template);
        registerGoyoHeaderFooterElement(albumInfoManager);
        //registerGoyoPhotoFrameElement(newLayoutInfo.path, albumInfoManager, useThumbnail);
        //registerGoyoTextFrameElement(albumInfoManager, makePhotoInfoText, isValidPhotoInformation);
      }
    }

    return new AlbumPageManager();
  }

  return {
    createAlbumPageManager
  };
})();
