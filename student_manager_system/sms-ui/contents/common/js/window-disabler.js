const __windowDisabler = (function() {
  const { ipcRenderer, } = require('electron');
  
  const EVENT_NAMES = [ 'click', 'dblclick', 'drop', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'contextmenu', 'mouseenter', 'mouseleave', 'mousemove', 'wheel'];

  const windowDisabler = {
    countWindow: 0,
    // Public methods.
    disableWindow() {
      if (this.countWindow===0) {
        this._disableWindow();
      }
      this.countWindow++;
    },
    enableWindow() {
      if (this.countWindow > 0) {
        this.countWindow--;
        if (this.countWindow===0) {
          this._enableWindow();
        }
      }
    },

    // Private methods.
    _disableWindow() {
      for (let eName of EVENT_NAMES) {
        window.addEventListener(eName, this._listener,true);
      }
      window.dispatchEvent(new CustomEvent("disable-window"));
    },
    _enableWindow() {
      for (let eName of EVENT_NAMES) {
        window.removeEventListener(eName, this._listener, true);
      }
      window.dispatchEvent(new CustomEvent("enable-window"));
    },
    _listener(e) {
      e.stopPropagation();
      e.preventDefault();
    },
  };

  ipcRenderer.on('disable-window', (event, from='') => {
    windowDisabler.disableWindow();
    if (logger) logger.debug(`event 'disable-window' from ${from}`);
  });
  ipcRenderer.on('enable-window', (event, from='') => {
    windowDisabler.enableWindow();
    if (logger) logger.debug(`event 'enable-window' from ${from}`);
  });

  return windowDisabler;
})();