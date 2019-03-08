module.exports = ((params = {}) => {
  const config = Object.assign({
    offset: '0',
    position: 'top',
    width: 'auto',
    style: {},
  }, params)

  var json = JSON.stringify(params);
  var parsed = JSON.parse(json);

  const electron = require('electron')
  const { BrowserWindow, app } = electron.remote
  const { ipcRenderer } = electron
  const win = electron.remote.getCurrentWindow()

  const path = require('path')
  const url = require('url')

  let popupWin = new BrowserWindow({
    resizable: false,
    alwaysOnTop: true,
    focusable: true,
    frame: false,
    show: false,
    hasShadow: false,
    transparent: true,
    parent: win
  })

  popupWin.loadURL(url.format({
    pathname: path.join(__dirname, 'popup.html'),
    protocol: 'file:',
    slashes: true
  }))

  window.onbeforeunload = e => {
    popupWin.destroy()
    popupWin = null
  }
  popupWin.webContents.openDevTools();
  popupWin.webContents.on('did-finish-load', () => {
    popupWin.webContents.send('set-styling', config.style)

    const popupMenus = document.querySelectorAll('[data-popupmenu]')

    Array.prototype.forEach.call(popupMenus, popupMenu => {
      popupMenu.addEventListener('mouseenter', e => {
        e.stopPropagation()
        const popupTitle = e.target.getAttribute('data-popuptitle')
        const menuName = e.target.getAttribute('data-popupmenu')
        var DOMhtml = '';
        if (params != '') {
          var arrMenu = [];
          for (var x in parsed) {
            if (x == menuName) {
              arrMenu.push(parsed[x]);
              DOMhtml = createHtmlPopup(arrMenu[0], popupTitle).outerHTML;
            }
          }
        }
        if (DOMhtml == '') {
          return false;
        }
        const content = DOMhtml
        const dimensions = e.target.getBoundingClientRect()
        const localConfig = {
          offset: e.target.getAttribute('data-popup-offset') || config.offset,
          width: e.target.getAttribute('data-popup-width') || config.width,
          position: e.target.getAttribute('data-popup-position') || config.position
        }

        popupWin.webContents.send('set-content', {
          config: localConfig,
          title: popupTitle,
          content: content,
          elmDimensions: dimensions,
          originalWinBounds: win.getContentBounds()
        })
      })
    })

  })

})

function createHtmlPopup($menu, $title) {
  var rows = parseInt($menu.length);
  var cols = parseInt(Object.keys($menu[0]).length);

  var wIcon = hIcon = 40;
  var borderIcon = 1;
  var w = cols * (wIcon) + 2 * borderIcon;
  var h = rows * (hIcon) + 2 * borderIcon;
  var hTitle = 0;
  if ($title !== null && $title != '') {
    hTitle = 30;
    var titles = document.createElement("div");
    titles.className = 'popup-title';
    titles.appendChild(document.createTextNode($title));
    titles.setAttribute("style", "width: " + w + "px; height: " + hTitle + "px;background: #ffffe0;border: 1px solid #a09c9c;border-bottom: none; padding: 5px");
  }
  var content = document.createElement("div");
  content.className = 'elc-popup';
  content.setAttribute("style", "height: " + (h + hTitle) + "px; width: " + w + "px; background: #e1e9ef")

  var contentPU = document.createElement("div");
  contentPU.className = 'popup-content';
  contentPU.setAttribute("style", "width: " + w + "px; height: " + h + "px;border: 1px solid #a09c9c ");

  for (var i = 0; i < rows; i++) {
    var itemR = document.createElement("div");
    itemR.className = 'row';
    itemR.setAttribute("style", "margin-right: 0; margin-left: 0; height: " + hIcon + "px; width: " + w + "px ");

    for (var j = 0; j < cols; j++) {
      var item = document.createElement('div');
      item.className = 'item';
      item.setAttribute("style", "width: " + wIcon + "px; height: " + hIcon + "px; float: left ");

      var img = document.createElement("img");
      for (var key in $menu[i][j]) {
        img.setAttribute('src', key);
      }
      img.setAttribute("style", "width: " + wIcon + "px; height: " + hIcon + "px; border: " + borderIcon + "px solid; margin: 1px;border-style: outset;");
      item.append(img);
      itemR.append(item);
    }
    contentPU.append(itemR);
  }
  if ($title !== null && $title != '') {
    content.append(titles);
  }
  content.append(contentPU);
  return content;
}