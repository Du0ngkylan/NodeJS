(function() {
  'use strict';
  const dateformat = require('dateformat');
  const NENGAPPI_REGEX = /\d\d\d\d-\d\d-\d\d/;

  let importDoc = document.currentScript.ownerDocument;
  let template = importDoc.querySelector('template');

  function path2Url(p, suppressCache) {
    let suffix = (suppressCache) ? `?_=${Date.now()}` : '';
    let filePath = encodeURI(p.replace(/\\/g, '/'));
    filePath = filePath.replace(/\#/g, '\%23');
    return `file:///${filePath}${suffix}`;
  }
  function isEmptyPhotoFrame(frameInfo) {
    if(frameInfo.photoFrames.length===0){
      return true;
    }else if(frameInfo.photoFrames.length>0){
      let reg=/(.*)(?:\.([^.]+$))/;
      return (frameInfo.photoFrames[0].fileArias.match(reg)[2]==='TPI')?true:false;
    }
  }
  
  class GoyoPhotoFrame extends HTMLElement {
    constructor() {
      super();

      let shadow = this.attachShadow({mode: 'open'});
      shadow.appendChild(template.content.cloneNode(true));

      shadow.querySelector('img.textIcon').addEventListener('click', (e) => {
        e.stopPropagation();
        this.dispatchEvent(new Event('text-icon-click'), {bubble: true, composed:true});
      });
    }

    connectedCallback() {
      if (this._needsApply) {
        this._apply();
        this._needsApply = false;
      }
    }

    attributeChangedCallback(name, oldVal, newVal) {
      switch (name) {
        case 'aspect':
        case 'valign':
        case 'halign':
        case 'scaletype':
          this.shadowRoot.querySelector('goyo-photo').setAttribute(name, newVal);
          break;
        case 'use-thumbnail':
          if (this._frame && this._frame.frameInfo) {
            if ((oldVal=='true') != (newVal=='true')) {
              let frameInfo = this._frame.frameInfo;
              let imagePath = (newVal=='true') ?
                frameInfo.photoFrames[0].thumbnail:
                frameInfo.photoFrames[0].imageFile;
              let imageUrl = path2Url(imagePath, true);
              this.shadowRoot.querySelector('goyo-photo').setAttribute('src', imageUrl);
            }
          }
          break;
        case 'condition':
          if (newVal.match('DISPLAY_T')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'T');
          } else if (newVal.match('DISPLAY_X')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'X');
          } else if (newVal.match('DISPLAY_F')) {
            this.shadowRoot.children[1].setAttribute('displaytype', 'F');
          } else {
            this.shadowRoot.children[1].removeAttribute('displaytype');
          }
          break;
        default:
          break;
      }
    }

    isLoading() {
      return this.shadowRoot.querySelector('goyo-photo').isLoading();
    }
    set onloadOnce(v) {
      this.shadowRoot.querySelector('goyo-photo').onloadOnce = v;
    }

    applyFrame(frameIndex, frame) {
      this._frame = frame;

      this.reset();
      //if (!this.onload) {
      //  this.onload = () => {};
      //}

      if (this.isConnected) {
        this._apply();
      } else {
        this._needsApply = true;
      }

    };
    reset() {
      let shootingDates = this.shadowRoot.querySelector('div.shooting-dates');
      shootingDates.children[0].textContent = '';
      shootingDates.children[1].textContent = '';
      shootingDates.children[2].textContent = '';

      //this.shadowRoot.querySelector('goyo-photo').setAttribute('src', '');
      this.shadowRoot.querySelector('div.jacic-check').setAttribute('believability', 'NONE');
      this.shadowRoot.children[1].setAttribute('photo-info-border', "none");
    }
    makeReady() {
    };
    _apply() {
      let frameState = this._frame.frameState;
      let frameInfo = this._frame.frameInfo;

      switch (frameState) {
        case Frame.UNLOADED_FRAME:
          this.shadowRoot.querySelector('goyo-photo').setAttribute('src', '');
          //if (this.onload) { this.onload(); this.onload = null; }
          break;
        case Frame.EMPTY_FRAME:
          this.shadowRoot.querySelector('goyo-photo').setAttribute('src', '');
          //if (this.onload) { this.onload(); this.onload = null; }
          break;
        case Frame.RESERVED_FRAME:
        case Frame.NORMAL_FRAME:
        case Frame.REFERED_FRAME:
          {
            let imagePath = (this.getAttribute('use-thumbnail')==='true')?
              frameInfo.photoFrames[0].thumbnail:
              frameInfo.photoFrames[0].imageFile;
            let imageUrl = path2Url(imagePath, true);
            this.shadowRoot.querySelector('goyo-photo').setAttribute('src', imageUrl);
          }
          break;
      }

      if (!frameInfo) { return; }

      /* photo-info-border settings.  */
      if (frameState === Frame.REFERED_FRAME) {
        this.shadowRoot.children[1].setAttribute('photo-info-border', "refered");
      }
      if (frameInfo.constructionPhotoInformation
        && frameInfo.constructionPhotoInformation.hasOwnProperty('写真情報')
        && Object.keys(frameInfo.constructionPhotoInformation['写真情報']).length!==0) {
        this.shadowRoot.children[1].setAttribute('photo-info-border', "normal");
      }else if(isEmptyPhotoFrame(frameInfo)) {
        this.shadowRoot.children[1].setAttribute('photo-info-border', "emptyframe");
      }

      /* Jacic believability and shooting date settings.  */
      if (frameState===Frame.NORMAL_FRAME || frameState===Frame.REFERED_FRAME) {
        let pf = frameInfo.photoFrames[0];

        this.shadowRoot.querySelector('div.jacic-check').setAttribute(
          'believability',
          pf['jacic.believability'] || 'NONE');

        {
          let shootingDates = this.shadowRoot.querySelector('div.shooting-dates');

          if (pf.hasOwnProperty('EXIF:DateTimeOriginal')) {
            try {
              let dt = new Date(pf['EXIF:DateTimeOriginal']);
              shootingDates.children[0].textContent = dateformat(dt, 'yyyy/mm/dd');
              shootingDates.children[1].textContent = dateformat(dt, 'yyyy/mm/dd HH:MM');
            } catch(e) {
              // do nothind.
            }
          }

          if (frameInfo.constructionPhotoInformation &&
            frameInfo.constructionPhotoInformation.hasOwnProperty('写真情報') &&
            frameInfo.constructionPhotoInformation['写真情報'].hasOwnProperty('撮影年月日') &&
            NENGAPPI_REGEX.test(frameInfo.constructionPhotoInformation['写真情報']['撮影年月日']))
          {
            try {
              let dt = new Date(frameInfo.constructionPhotoInformation['写真情報']['撮影年月日']);
              shootingDates.children[2].textContent = dateformat(dt, 'yyyy/mm/dd');
            } catch(e) {
              // do nothind.
            }
          }
        }
      }

      /* photo orientation and icon settings.   */
      if (frameInfo.textFrames) {
        let texts = frameInfo.textFrames;
        let textIcon = this.shadowRoot.querySelector('img.textIcon');

        if (texts.hasOwnProperty('visibility.sentence') && texts['visibility.sentence'].fieldValue === 'hide') {
          textIcon.setAttribute('visible', 'true');
        } else {
          textIcon.setAttribute('visible', 'false');
        }

        if (texts.hasOwnProperty('goyo.photo.rotate')) {
          this.shadowRoot.querySelector('goyo-photo').setAttribute(
            'rotate',
            texts['goyo.photo.rotate'].fieldValue
          );
        }

        if (texts.hasOwnProperty('goyo.photo.flip')) {
          this.shadowRoot.querySelector('goyo-photo').setAttribute(
            'flip',
            texts['goyo.photo.flip'].fieldValue
          );
        }
      }

      /* refer icon settings.  */
      let referIcon = this.shadowRoot.querySelector('img.reference');
      if (frameInfo.constructionPhotoInformation
        && frameInfo.constructionPhotoInformation.hasOwnProperty('写真情報')
      ) {
        let pi = frameInfo.constructionPhotoInformation['写真情報'];
        if ((pi['参考図'] && pi['参考図'].length > 0) || (pi['参考図情報'] && pi['参考図情報'].length > 0)
        ){
          referIcon.setAttribute('visible', 'true');
        } else {
          referIcon.setAttribute('visible', 'false');
        }
      } else {
        referIcon.setAttribute('visible', 'false');
      }
    };
    getAppliedFrame() {
      return this._frame;
    };

    static get observedAttributes() {
      return [ 'condition', 'image', 'aspect', 'valign', 'halign', 'scaletype', 'use-thumbnail' ];
    }
  }
  customElements.define('goyo-photoframe', GoyoPhotoFrame);

})();

