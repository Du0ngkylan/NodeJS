'use strict';

// Node.js modules.
const assert = require('assert');


module.exports = {
  convert(source) {
    let converter = new Converter();
    if (converter.convert(source)) {
      return converter.result;
    } else {
      return null;
    }
  }
};

class Converter {
  constructor() {
    this._offset = [0, 0];
    this._offsetStack = [];
  }

  convert(source) {
    this._source = source;
    this._temporalResult = { };

    this.loadBasicInfo(this._source);

    { // parse left page layout definition.
      let layout = this._source.layout.find(l => l.layoutType==='leftPage');
      assert(layout);
      let { albumBlocks, albumArea, legacyHeader, legacyFooter } = this.parsePage(layout);
      this._temporalResult.leftPageBlockCount = albumBlocks.length;
      this._temporalResult.goyoAlbumAreaLeft = albumArea;
      this._temporalResult.legacyHeaderLeft = legacyHeader;
      this._temporalResult.legacyFooterLeft = legacyFooter;
      this._temporalResult.albumBlocksLeft = albumBlocks;
    }
      
    { // parse right page layout definition.
      let layout = this._source.layout.find(l => l.layoutType==='rightPage');
      assert(layout);
      let { albumBlocks, albumArea, legacyHeader, legacyFooter } = this.parsePage(layout);
      this._temporalResult.rightPageBlockCount = albumBlocks.length;
      this._temporalResult.goyoAlbumAreaRight = albumArea;
      this._temporalResult.legacyHeaderRight = legacyHeader;
      this._temporalResult.legacyFooterRight = legacyFooter;
      this._temporalResult.albumBlocksRight = albumBlocks;
    }

    let {left, right} = 
      this.adjustGoyoAlbumArea(this._temporalResult.goyoAlbumAreaLeft, this._temporalResult.goyoAlbumAreaRight);
    this._temporalResult.goyoAlbumAreaLeft = left;
    this._temporalResult.goyoAlbumAreaRight = right;

    return true;
  }

  adjustGoyoAlbumArea(left, right) {
    // Adjust goyoAlbumArea rectangle size.
    //  * left and right rectangles are same saze.
    //  * width:height = √2 : 1
    //  * Each adjusted area exactly contains the original area.

    let leftCenter = { x: left.x + left.width/2, y: left.y + left.height/2};
    let rightCenter = { x: right.x + right.width/2, y: right.y + right.height/2};

    let width = Math.max(left.width, right.width);
    let height = Math.max(left.height, right.height);

    let printWidth = 420.0 - this._source.defaultPrintMargins.left - this._source.defaultPrintMargins.right;
    let printHeight =  297.0 - this._source.defaultPrintMargins.top - this._source.defaultPrintMargins.bottom;
    let stageAspect = printWidth / printHeight;

    if (width * stageAspect / height > Math.SQRT1_2) {
      // Expand height.
      //  width * stageAspect / height = 1/√2
      //  √2 * width * stageAspect = height
      height = width * stageAspect * Math.SQRT2;
    } else {
      // Expand width.
      //  width * stageAspect / height = 1/√2
      //  width =  1/√2 * height / stageAspect
      width = height / stageAspect * Math.SQRT1_2;
    }

    let adjustedLeft = {
      x: leftCenter.x - width / 2,
      y: leftCenter.y - height / 2,
      width,
      height,
    };
    let adjustedRight = {
      x:  rightCenter.x - width / 2,
      y:  rightCenter.y - height / 2,
      width,
      height,
    };

    return { left: adjustedLeft, right: adjustedRight };
  }

  get result() {
    let template = {
      "albumTemplateid": this._source.albumTemplateid,
      "revision": (this._source.hasOwnProperty('revision')) ? this._source.revision : 1,
      "albumName": this._source.albumName,
      "paperType": this._source.paperType,
      "defaultMargins": this._source.defaultPrintMargins,
      "fontfamily": this._source.fontfamily,
      "matchKokubanTypes": this._source.matchKokubanTypes,
      "leftPageBlockCount": this._temporalResult.leftPageBlockCount,
      "rightPageBlockCount": this._temporalResult.rightPageBlockCount,
      "goyoAlbumAreaLeft": this._temporalResult.goyoAlbumAreaLeft,
      "goyoAlbumAreaRight": this._temporalResult.goyoAlbumAreaRight,
      "legacyHeaderFooterArea": {
        "headerLeftPage": this._temporalResult.legacyHeaderLeft,
        "footerLeftPage": this._temporalResult.legacyFooterLeft,
        "headerRightPage": this._temporalResult.legacyHeaderRight,
        "footerRightPage": this._temporalResult.legacyFooterRight,
        "defaultText": {
          "leftTop": "",
          "centerTop": "",
          "rightTop": "",
          "leftBottom": "",
          "centerBottom": "",
          "rightBottom": ""
        },
      },
      "elements": [ ],
      "blocks": [ ],
    };

    let albumBlocks = this._temporalResult.albumBlocksLeft.concat(this._temporalResult.albumBlocksRight)
    for (let frames of albumBlocks) {
      template.blocks.push({ elements: frames });
    }

    return template;
  }

  loadBasicInfo(source) {
    this._stageSize = source.stageSize;
    this._importBlocks = {};
    for (let block of source.importBlocks) {
      this._importBlocks[block.blockid] = block;
    }
  }

  parsePage(page) {
    this.pushOffset(page.x, page.y);

    if (page.header) {
      this.parseNonAlbumFrameElement(page.header);
    }
    if (page.footer) {
      this.parseNonAlbumFrameElement(page.footer);
    }

    let albumBlocks = [];
    if (page.blocks) {
      for (let block of page.blocks) {
        let elements = this.parseAlbumFrameElement(block);
        albumBlocks.push(elements);
      }
    }

    let legacyHeader = undefined;
    let legacyFooter = undefined;
    if (page.defaultHeaderFooterBlock) {
      let dhfBlock = page.defaultHeaderFooterBlock;
      let header = {
        x: dhfBlock.x,
        y: dhfBlock.headerY,
        width: dhfBlock.width,
        height: dhfBlock.height,
      };
      let footer = {
        x: dhfBlock.x,
        y: dhfBlock.footerY,
        width: dhfBlock.width,
        height: dhfBlock.height,
      };

      legacyHeader = { rect: this.computeCurrentOffsetRect(header) };
      legacyFooter = { rect: this.computeCurrentOffsetRect(footer) };

      // set font size.
      legacyHeader.fontsize = this.computeRealSize(header).height / 25.4 * 72;
      legacyFooter.fontsize = this.computeRealSize(footer).height / 25.4 * 72;
    }

    let albumArea = this.computeCurrentRect(page.goyoAlbumArea);
    this.popOffset();

    return { albumBlocks, albumArea, legacyHeader, legacyFooter };
  }

  parseNonAlbumFrameElement(element) {
    //this._frameStore = [];
    //this.pushOffset(element.x, element.y);
    //this.parseImportBlock(element.blockid);
    //this._nonAlbumFrameStore.push(this._frameStore);
    //this.popOffset();
  }

  parseAlbumFrameElement(element) {
    this.pushOffset(element.x, element.y);
    let frames = this.parseImportBlock(element.blockid);
    this.popOffset();
    return frames;
  }
  
  parseImportBlock(blockId) {
    let frameStore = [];
    let block = this._importBlocks[blockId];
    let count = 0;

    if (block.frames instanceof Array) {
      for (let frame of block.frames) {
        this._defaultKey = `IB${blockId}-${count++}`;
        frameStore.push(this.makeFrame(frame));
        //this.emitFrame(frame);
      }
    } else if (block.frames instanceof Object) {
      if (block.frames.t instanceof Array) {
        for (let frame of block.frames.t) {
          this._defaultKey = `IB${blockId}-${count++}`;
          frameStore.push(this.makeFrame(frame, 'DISPLAY_T'));
          //this.emitFrame(frame, 'DISPLAY_T');
        }
      }

      if (block.frames.x instanceof Array) {
        for (let frame of block.frames.x) {
          this._defaultKey = `IB${blockId}-${count++}`;
          frameStore.push(this.makeFrame(frame, 'DISPLAY_X'));
          //this.emitFrame(frame, 'DISPLAY_X');
        }
      }
    }

    return frameStore.filter(f => f!=null);
  }

  makeFrame(frame, cond) {
    if (frame.frameType === 'image') {
      return this.makeImageFrame(frame, cond);
    } else if (frame.frameType === 'text') {
      return this.makeTextFrame(frame, cond);
    } else {
      return null;
      // not support other than image or text.
    }
  }

  makeImageFrame(frame, cond) {
    assert(frame.src === 'photo');

    let imageFrame = {
      frameType: 'image',
      rect: this.computeCurrentOffsetRect(frame),
      image: 0,
      scaleType: frame.scaleType || 'infit',
      verticalAlign: frame.verticalAlign || 'middle',
      horizontalAlign: frame.horizontalAlign || 'center', 
    };
    if (cond) {
      imageFrame.condition = cond;
    }

    return imageFrame;
  }

  makeTextFrame(frame, cond) {
    assert(frame.hasOwnProperty('fontsize'));

    let textFrame = {
      frameType: 'text',
      rect: this.computeCurrentOffsetRect(frame),
      verticalAlign: frame.verticalAlign || 'middle',
      horizontalAlign: frame.horizontalAlign || 'center', 
      fontsize: frame.fontsize,
      multiline: frame.hasOwnProperty('multiline') ? frame.multiline : true,
      ruleline: frame.hasOwnProperty('ruleline') ? frame.ruleline : true,
      textFormat: frame.hasOwnProperty('textFormat') ? frame.textFormat : '{{goyo.photoinfotext}}',
    };
    if (frame.userSettingEnabled) {
      textFrame.key = (frame.hasOwnProperty('key'))
        ? frame.key
        : this._defaultKey;
    }

    if (cond) {
      textFrame.condition = cond;
    }

    return textFrame;
  }

  computeCurrentRect(rect) {
    return {
      x: (rect.x || 0) / this._stageSize.width * 10000,
      y: (rect.y || 0) / this._stageSize.height * 10000,
      width: (rect.width || 0) / this._stageSize.width * 10000,
      height: (rect.height || 0) / this._stageSize.height * 10000,
    };
  }

  computeCurrentOffsetRect(rect) {
    return {
      x: (this._offset[0] + (rect.x || 0)) / this._stageSize.width * 10000,
      y: (this._offset[1] + (rect.y || 0)) / this._stageSize.height * 10000,
      width: (rect.width || 0) / this._stageSize.width * 10000,
      height: (rect.height || 0) / this._stageSize.height * 10000,
    };
  }

  computeRealSize({width, height}) {
    let printWidth = 420.0 - this._source.defaultPrintMargins.left - this._source.defaultPrintMargins.right;
    let printHeight =  297.0 - this._source.defaultPrintMargins.top - this._source.defaultPrintMargins.bottom;
    return {
      width: printWidth * (width / this._stageSize.width),
      height: printHeight * (height / this._stageSize.height),
    };
  }

  pushOffset(x, y) {
    this._offset[0] += x;
    this._offset[1] += y;
    this._offsetStack.push({x,y});
  }

  popOffset() {
    assert(this._offsetStack.length>0);
    let {x, y} = this._offsetStack.pop();
    this._offset[0] -= x;
    this._offset[1] -= y;
  }
}

