// Electron module
const electron = require('electron');
const {
  screen
} = require('electron');
var storeCursorEvent = {
  oldPosX: null,
  oldPosY: null,
  isMouseDown: false,
  dontMove: false,
  setDontMoveWindow: function (dontMove) {
    this.dontMove = dontMove;
  },
  getDontMoveWindow: function () {
    return this.dontMove;
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
    let pos = {
      'x': this.oldPosX,
      'y': this.oldPosY
    };
    return pos;
  }
}
var storeWindowSize = {
  width: -1,
  height: -1
}

function initDocumentElement(document, listElementCantMoveWindow = []){
  let defaultElementCantMove = ["input"," button","textarea","select"];
  elementsCantMove = defaultElementCantMove.concat(listElementCantMoveWindow);
  for (let i=0;i <elementsCantMove.length; i++){
    $(document).on('mousedown',  elementsCantMove[i], (event) => {
      storeCursorEvent.setDontMoveWindow(true);
    })
  }
  $(document).on('mousemove', mouseMoveEventInDocument);
  $(document).on('mouseup', mouseUpEventInDocument);
  $(document).on('mousedown', (event) => {
    if (!storeCursorEvent.getDontMoveWindow()) {
      storeCursorEvent.setMouseDown(true);
      storeCursorEvent.setCurrsorAppPos(event.clientX, event.clientY);
      storeWindowSize.width = electron.remote.getCurrentWindow().getSize()[0];
      storeWindowSize.height = electron.remote.getCurrentWindow().getSize()[1];
    }
  })
}

function mouseUpEventInDocument(event) {
  if (storeCursorEvent.getDontMoveWindow()) {
    storeCursorEvent.setDontMoveWindow(false);
  }
  if (storeCursorEvent.getMouseDown()) {
    storeCursorEvent.setMouseDown(false);
  }
}

function mouseMoveEventInDocument(event) {
  if (storeCursorEvent.getMouseDown()) {
    // move window follow cursor's position
    let sizeApp = electron.remote.getCurrentWindow().getSize();
    let cursorScreenPos = electron.screen.getCursorScreenPoint();
    let win = electron.remote.getCurrentWindow()
    let cursorAppPos = storeCursorEvent.getCurrsorAppPos();
    let postionX = cursorScreenPos.x - cursorAppPos.x;
    let postionY = cursorScreenPos.y - cursorAppPos.y;
    // console.log("app: (x,y): (" + cursorAppPos.x+ " " + cursorAppPos.y + ")--screen (x,y):(" + cursorScreenPos.x + "," + cursorScreenPos.y + ")");
    let screenWidth = screen.getPrimaryDisplay().size.width;
    let screenHeight = screen.getPrimaryDisplay().size.height;
    let windowSize = electron.remote.getCurrentWindow().getSize();
    if (electron.remote.getCurrentWindow().isFullScreen() ||
      (windowSize[0] == screenWidth && windowSize[1] == screenHeight)) {
      let ratioX = cursorAppPos.x / sizeApp[0];
      let ratioY = cursorAppPos.y / sizeApp[1];
      electron.remote.getCurrentWindow().setFullScreen(false);
      sizeApp = electron.remote.getCurrentWindow().getSize();
      cursorAppPos.x = Math.round(ratioX * sizeApp[0]);
      cursorAppPos.y = Math.round(ratioY * sizeApp[1]);
      storeCursorEvent.setCurrsorAppPos(cursorAppPos.x, cursorAppPos.y)
      storeWindowSize.width = sizeApp[0];
      storeWindowSize.height = sizeApp[1];
    }
    // win.setPosition(postionX, postionY);        
    win.setBounds({
      width: storeWindowSize.width,
      height: storeWindowSize.height,
      x: postionX,
      y: postionY
    });
  }
}
