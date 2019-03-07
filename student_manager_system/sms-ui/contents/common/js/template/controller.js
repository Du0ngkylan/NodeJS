'use strict';
const { ActionManager } = (function() {

if (process.type !== 'renderer') {
  throw new Error('INTERNAL ERROR: this module can be imported from rederer process only.');
}

class ActionManager extends require('events') {
  mouseenter(evt, frameIndex, frame) { }
  mouseleave(evt, frameIndex, frame) { }
  click(evt, frameIndex, frame) { }
  dblclick(evt, frameIndex, frame) { }
  dragstart(evt, frameIndex, frame) { }
  dragend(evt, frameIndex, frame) { }
  dragenter(evt, frameIndex, frame) { }
  dragover(evt, frameIndex, frame) { }
  dragleave(evt, frameIndex, frame) { }
  drop(evt, frameIndex, frame) { }
  contextmenu(evt, frameIndex, frame) { }
  texticonclick(evt, frameIndex, frame) { }
}

return { ActionManager };
})();
