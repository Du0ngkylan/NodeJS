const { Frame, FrameManager, AlbumInfoManager } =
(function() {
  'use strict';

  // Node.js modules
  const EventEmitter = require('events');
  
  class Frame extends EventEmitter {
    constructor(frameInfo = null) {
      super();
      // public properties.
      this.frameInfo = null;
  
      // private properties.
      this._selectedState = Frame.UNSELECTED;

      // initialize
      if (frameInfo) {
        this.setContent(frameInfo);
      }
    }
  
    setContent(frameInfo) {
      this.frameInfo = frameInfo;
      this.emit('change-frame-state', this);
    }

    get frameState() {
      if (this.frameInfo == null) {
        return Frame.UNLOADED_FRAME;
      } else if (this.frameInfo.photoFrames.length === 0) {
        return Frame.EMPTY_FRAME;
      } else if (/.tpi$/i.test(this.frameInfo.photoFrames[0].imageFile)) {
        return Frame.RESERVED_FRAME;
      } else if (this.frameInfo.hasOwnProperty('referenceSouceAlbumFrameId') && this.frameInfo.referenceSouceAlbumFrameId !== 0) {
        return Frame.REFERED_FRAME;
      } else {
        return Frame.NORMAL_FRAME;
      }
    }
  
    set selectedState(state) {
      this._selectedState = state;
      this.emit('change-selected-state', state);
    }
  
    get selectedState() {
      return this._selectedState;
    }
  }
  Frame.UNLOADED_FRAME = 0;
  Frame.EMPTY_FRAME = 1;
  Frame.RESERVED_FRAME = 2;
  Frame.NORMAL_FRAME = 3;
  Frame.REFERED_FRAME = 4;

  Frame.UNSELECTED = 0;
  Frame.SELECTED_AS_MAIN = 1;
  Frame.SELECTED_AS_SUB = 2;
  Frame.SELECTED_AND_APPEAL = 3;
  Frame.DUMMY_FRAME_INFO = { "albumFrameId": undefined, "photoFrames": [], "textFrames": {} };
  
  
  class FrameManager extends EventEmitter {
  
    constructor(size) {
      super();
      // private properties.
      this._frames = [];
      this._length = size;
      for (let i=0; i<size; i++) {
        this._frames.push(new Frame());
      }

      this.setMaxListeners(1000);
      this.bookmarkColors = [
        {colorIndex: 0, colorCode: '#cfd0ff', borderColor: '#b1afe1'},
        {colorIndex: 1, colorCode: '#d5ffcc', borderColor: '#b7e1aa'},
        {colorIndex: 2, colorCode: '#fccfd0', borderColor: '#e8b1b2'},
        {colorIndex: 3, colorCode: '#ffffff', borderColor: '#e1e1e1'},
        {colorIndex: 4, colorCode: '#fee0bd', borderColor: '#e0c29f'},
        {colorIndex: 5, colorCode: '#c6ffde', borderColor: '#9ee1c0'},
        {colorIndex: 6, colorCode: '#ddc0ff', borderColor: '#bfa2e1'},
        {colorIndex: 7, colorCode: '#fbbfe2', borderColor: '#dda1c4'},
        {colorIndex: 8, colorCode: '#e3ffbb', borderColor: '#c5e19d'},
        {colorIndex: 9, colorCode: '#c1e0ff', borderColor: '#a3c2e1'},
        {colorIndex: 10, colorCode: '#fccfd0', borderColor: '#e8b1b2'},
        {colorIndex: 11, colorCode: '#d5ffcc', borderColor: '#b7e1ae'},
        {colorIndex: 12, colorCode: '#cfd0ff', borderColor: '#b1b2e1'},
        {colorIndex: 13, colorCode: '#ffff97', borderColor: '#e1e179'},
        {colorIndex: 14, colorCode: '#a8ffff', borderColor: '#8ae1e1'},
        {colorIndex: 15, colorCode: '#f99fff', borderColor: '#db81e1'},
      ];
    }
  
    get length() {
      return this._length;
    }
  
    set length(v) {
      this._length = v;
    }
  
    getFrameAt(index) {
      while (index >= this._frames.length) {
        this._frames.push(new Frame());
      }
      return this._frames[index];
    }

    getFramePositionById(id) {
      return this._frames.findIndex(f => f.frameInfo!=null && f.frameInfo.albumFrameId === id);
    }

    insertBlank(position=null, count) {
      this._length += count;

      if (position==null || position > this._frames.length) {
        position = this._frames.length;
      }

      let frameInfos = this._frames.map(f => f.frameInfo);
      let movedFrameInfos = frameInfos.slice(position);

      for (let i=0; i < count; i++) {
        this.getFrameAt(position+i).setContent(null);
        //if (this._frames[position+i]==null) {
        //  this._frames[position+i] = new Frame();
        //} else {
        //  this._frames[position+i].setContent(null);
        //}
      }

      for (let i = 0; i < movedFrameInfos.length; i++) {
        this.getFrameAt(position+count+i).setContent(movedFrameInfos[i]);
        //if (this._frames[position+count+i]==null) {
        //  this._frames[position+count+i] = new Frame();
        //}
        //this._frames[position+count+i].setContent(movedFrameInfos[i]);
      }
    }

    delete_(frameIds) {
      let frameInfos = this._frames
        .map(f => f.frameInfo)
        .filter(fi => fi==null || frameIds.every(id => id!==fi.albumFrameId));

      for (let i=0; i<this._frames.length; i++) {
        if (i < frameInfos.length) {
          this._frames[i].setContent(frameInfos[i]);
        } else {
          this._frames[i].setContent(null);
        }
      }
      this.length = this.length - frameIds.length;

      return true;
    }

    update_(position=null, frame) {
      if (position==null) {
        position = this._frames.findIndex(f => f.frameInfo.albumFrameId === frame.albumFrameId);
        if (position < 0) { return; }
      }

      this.getFrameAt(position).setContent(frame);
    }

    refresh(startIndex=0) {
      for (let frame of this._frames.slice(startIndex)) {
        let info = frame.frameInfo
        frame.setContent(info);
      }
    }
  }


  class AlbumInfoManager extends EventEmitter {
    constructor() {
      super();
      this.showBelievability = true;
      this.showFocusBorder = true;
      this.showPhotoInfoBorder = false;
      this.showTextIcon = false;
      this.showWarningIcon = false;
      this.shootingDateMode = 0;
      this.defaultFont = { fontFamily: 'Meiryo UI', fontSize: 14 };
      this.headers = { size: 0, left: "", center: "", right: "" };
      this.footers = { size: 0, left: "", center: "", right: "" };
      this.nonble =  { enable: true, size: 70, start: 1, prefix: "P.", position: "leftheader" };
      this.flipHeaderSideInEvenPage = true;

      this.constructionName = "";
      this.albumName = "";
      this._textIcon = 0;
      this._photoInfoTemplate = {
        "largeClassification": "",
        "photoClassification": "",
        "constructionType": "",
        "middleClassification": "",
        "smallClassification": ""
      };
      this.showFrameBorder = false;
    }

    set printDecoration(deco) {
      if (typeof deco.header === 'object') {
        if (deco.header.enable) {
          this.headers.left = deco.header.left || "";
          this.headers.center = deco.header.center || "";
          this.headers.right = deco.header.right || "";
          this.headers.size = deco.header.size || 0;
        } else {
          this.headers.left = "";
          this.headers.center = "";
          this.headers.right = "";
          this.headers.size = 0;
        }
      }

      if (typeof deco.footer === 'object') {
        if (deco.footer.enable) {
          this.footers.left = deco.footer.left || "";
          this.footers.center = deco.footer.center || "";
          this.footers.right = deco.footer.right || "";
          this.footers.size = deco.footer.size || 0;
        } else {
          this.footers.left = "";
          this.footers.center = "";
          this.footers.right = "";
          this.footers.size = 0;
        }
      }

      if (typeof deco.nonble === 'object') {
        const POSITION_MAP = ['leftheader', 'rightheader', '', '', 'leftfooter', 'rightfooter', 'centerfooter', '', ''];
        if (deco.nonble.enable) {
          this.nonble.enable = true;
          this.nonble.start = deco.nonble.start;
          this.nonble.offset = 0;
          this.nonble.prefix = deco.nonble.prefix || "";
          this.nonble.size = deco.nonble.size;
          this.nonble.position = POSITION_MAP[deco.nonble.position];
        } else {
          this.nonble.enable = false;
          this.nonble.start = 1;
          this.nonble.offset = 0;
          this.nonble.prefix = "";
          this.nonble.size = 0;
          this.nonble.position = "";
        }
      }

      this.emit('chage-headerfooter', this._headers, this._footers);
    }

    set albumInfo(info) {
      if (typeof info.constructionName === 'string') {
        this.constructionName = info.constructionName;
      }

      if (typeof info.albumName === 'string') {
        this.albumName = info.albumName;
      }

      if (typeof info.photoInfoTemplate === 'string') {
        if (typeof info.photoInfoTemplate.largeClassification === 'string') {
          this._photoInfoTemplate.largeClassification = info.photoInfoTemplate.largeClassification;
        }
        if (typeof info.photoInfoTemplate.photoClassification === 'string') {
          this._photoInfoTemplate.photoClassification = info.photoInfoTemplate.photoClassification;
        }
        if (typeof info.photoInfoTemplate.constructionType === 'string') {
          this._photoInfoTemplate.constructionType = info.photoInfoTemplate.constructionType;
        }
        if (typeof info.photoInfoTemplate.middleClassification === 'string') {
          this._photoInfoTemplate.middleClassification = info.photoInfoTemplate.middleClassification;
        }
        if (typeof info.photoInfoTemplate.smallClassification === 'string') {
          this._photoInfoTemplate.smallClassification = info.photoInfoTemplate.smallClassification;
        }
      }

      this.emit('chage-headerfooter', this._headers, this._footers);
    }
  }

  return { Frame, FrameManager, AlbumInfoManager };
})();

