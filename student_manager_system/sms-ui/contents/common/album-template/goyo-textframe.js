const GoyoTextFrame = (function() {
  'use strict';
  let importDoc = document.currentScript.ownerDocument;
  let template = importDoc.querySelector('template');

  class GoyoTextFrame extends HTMLElement {
    constructor() {
      super();

      let shadow = this.attachShadow({mode: 'open'});
      shadow.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      setImmediate(() => {
        if (this._needApply) {
          this._clearText();
          this._apply();
          this._needApply = false;
        }
        this.makeReady();
      });
    }

    attributeChangedCallback(name, oldVal, newVal) {
      switch (name) {
        case 'lines':
          this.shadowRoot.querySelector('goyo-normaltext').setAttribute('lines', newVal);
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('lines', newVal);
          break;
        case 'valign':
          this.shadowRoot.querySelector('goyo-normaltext').setAttribute('valign', newVal);
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('valign', newVal);
          break;
        case 'halign':
          this.shadowRoot.querySelector('goyo-normaltext').setAttribute('halign', newVal);
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('halign', newVal);
          break;
        case 'ruleline':
          this.shadowRoot.querySelector('goyo-normaltext').setAttribute('ruleline', newVal);
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('ruleline', newVal);
          break;
        case 'fontsize':
          this.style.fontSize = `${newVal*100}%`;
          break;
        case 'condition':
          if (newVal.match('DISPLAY_T')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'T');
            this.shadowRoot.children[2].setAttribute('displaytype', 'T');
          } else if (newVal.match('DISPLAY_X')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'X');
            this.shadowRoot.children[2].setAttribute('displaytype', 'X');
          } else if (newVal.match('DISPLAY_F')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'F');
            this.shadowRoot.children[2].setAttribute('displaytype', 'F');
          } else {
            this.shadowRoot.children[1].removeAttribute('displaytype');
            this.shadowRoot.children[2].removeAttribute('displaytype');
          }
          break;
        case 'selected':
          if (newVal === 'appeal') {
            this.shadowRoot.querySelector('goyo-normaltext').setAttribute('appeal', '');
            this.shadowRoot.querySelector('goyo-richtext').setAttribute('appeal', '');
          } else {
            this.shadowRoot.querySelector('goyo-normaltext').removeAttribute('appeal');
            this.shadowRoot.querySelector('goyo-richtext').removeAttribute('appeal');
          }
          break;
        case 'multiline':
          this.shadowRoot.querySelector('goyo-normaltext').setAttribute('multiline', newVal);
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('multiline', newVal);
          break;
        case 'disable-font-size':
          this.shadowRoot.querySelector('goyo-richtext').setAttribute('disable-font-size', newVal);
          break;
        default:
          break;
      }
    }

    applyFrame(frameIndex, frame) {
      this._frame = frame;
      this._frameIndex = frameIndex;
      this._needApply = true;
      if (this.isConnected) {
        this._clearText();
        this._apply();
        this._needApply = false;
        this.makeReady();
      }
    }

    reset() {
      this.style.visibility = 'visible';
      this.shadowRoot.querySelector('img.warning').setAttribute('warn', 'off');
      this.shadowRoot.children[1].setAttribute('background', 'show');
      this.shadowRoot.children[1].removeAttribute('disable-ruleline');
    }

    makeReady() {
      let textType = this.shadowRoot.children[1].getAttribute('text-type');
      if (textType === 'rich') {
        this.shadowRoot.querySelector('goyo-richtext').makeReady();
      }
    }

    get ready() {
      let textType = this.shadowRoot.children[1].getAttribute('text-type');
      if (textType === 'rich') {
        return this.shadowRoot.querySelector('goyo-richtext')._isReady;
      } else {
        return true;
      }
    }

    _apply() {
      //let frame = this._frame;
      let frameInfo = this._frame.frameInfo;
      this.shadowRoot.querySelector('img.warning').setAttribute('warn', 'off');

      let warning = 'off';
      if (frameInfo && frameInfo.constructionPhotoInformation) {
        let isValid = this.constructor._validator.checkValidity(frameInfo.constructionPhotoInformation);
        if (!isValid) {
          warning = 'on';
          //this.shadowRoot.querySelector('img.warning').setAttribute('warn', 'on');
        }
      }
      this.shadowRoot.querySelector('img.warning').setAttribute('warn', warning);

      if (frameInfo &&
        frameInfo.textFrames.hasOwnProperty('visibility.sentence') && 
        frameInfo.textFrames['visibility.sentence'].fieldValue === 'hide') {
        this.style.visibility = 'hidden';
      } else {
        this.style.visibility = 'visible';
      }

      if (frameInfo &&
        frameInfo.textFrames.hasOwnProperty('visibility.background') &&
        frameInfo.textFrames['visibility.background'].fieldValue === 'hide') {
        this.shadowRoot.children[1].setAttribute('background', 'hide');
        this.shadowRoot.children[1].setAttribute('disable-ruleline', '');
      } else {
        this.shadowRoot.children[1].setAttribute('background', 'show');
        this.shadowRoot.children[1].removeAttribute('disable-ruleline');
      }

      let matchState = 'none';
      let types = this.getAttribute('match-kokuban-types');
      if (types) {
        matchState = 'unmatch';
        if (frameInfo && frameInfo.textFrames.hasOwnProperty('kokuban.template.typeid')) {
          let typeid = frameInfo.textFrames['kokuban.template.typeid'].fieldValue;
          if (types.match(new RegExp(`\\b${typeid}\\b`))) {
            matchState = 'match';
          }
        }
      }
      this.shadowRoot.children[1].setAttribute('kokuban-match-state', matchState);

      switch (this._frame.frameState) {
        case Frame.UNLOADED_FRAME:
          this.shadowRoot.children[1].setAttribute('framestate', 'unloaded');
          this._clearText();
          break;
        case Frame.EMPTY_FRAME:
          this.shadowRoot.children[1].setAttribute('framestate', 'empty');
          this._clearText();
          break;
        case Frame.RESERVED_FRAME:
          this.shadowRoot.children[1].setAttribute('framestate', 'reserved');
          this._makeText();
          break;
        case Frame.NORMAL_FRAME:
        case Frame.REFERED_FRAME:
          this.shadowRoot.children[1].setAttribute('framestate', 'normal');
          this._makeText();
          break;
      }
    }

    _clearText() {
      this.shadowRoot.children[1].setAttribute('text-type', 'normal');
      this.shadowRoot.querySelector('goyo-normaltext').setText('');
    }

    _makeText() {
      let key = this.getAttribute('key');
      let format = this.getAttribute('format');
      let frameInfo = this._frame.frameInfo;

      if (key && frameInfo && frameInfo.textFrames.hasOwnProperty(key)) {
        let textFrame = frameInfo.textFrames[key];
        if (textFrame.richText && textFrame.richText.ops) {
          this.shadowRoot.children[1].setAttribute('text-type', 'rich');
          let grt = this.shadowRoot.querySelector('goyo-richtext');
          grt.setDelta(frameInfo.textFrames[key].richText.ops);
        } else {
          let valign = this.getAttribute('valign');
          if (valign === 'middle') {
            this.shadowRoot.children[1].setAttribute('text-type', 'rich');
            let grt = this.shadowRoot.querySelector('goyo-richtext');
            grt.setText(frameInfo.textFrames[key].fieldValue);
          } else {
            let text = frameInfo.textFrames[key].fieldValue;
            this.shadowRoot.querySelector('goyo-normaltext').setText(text);
          }
        }
      } else {
        let valign = this.getAttribute('valign');
        if (valign === 'middle') {
          this.shadowRoot.children[1].setAttribute('text-type', 'rich');
          let spreadIndex = this.parentElement.getAttribute('spreadIndex');
          let grt = this.shadowRoot.querySelector('goyo-richtext');
          grt.setText(this.constructor._formatter.format(format, frameInfo, spreadIndex));
        } else {
          let spreadIndex = this.parentElement.getAttribute('spreadIndex');
          let gnt = this.shadowRoot.querySelector('goyo-normaltext');
          gnt.setText(this.constructor._formatter.format(format, frameInfo, spreadIndex));
        }
      }
    }

    getAppliedFrame() {
      return this._frame;
    }

    getCurrentText() {
      return this.shadowRoot.querySelector('goyo-normaltext').getText();
    }

    static get observedAttributes() {
      return [ 'lines', 'valign', 'halign', 'ruleline', 'fontsize', 'condition', 'selected', 'multiline', 'disable-font-size' ];
    }
    static set formatter(v) {
      this._formatter = v;
    }
    static set photoInfoValidator(v) {
      this._validator = v;
    }
  }

  GoyoTextFrame._formatter = {
    format() { return ''; }
  };
  GoyoTextFrame._validator = {
    checkValidity() { return true; }
  };

  customElements.define('goyo-textframe', GoyoTextFrame);
  return GoyoTextFrame;
})();

