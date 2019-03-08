const electron = require('electron')
const { BrowserWindow, app } = electron.remote
const { ipcRenderer, ipcMain } = electron
const popupWindow = electron.remote.getCurrentWindow()
const elm = document.getElementById('electron-popup')

elm.addEventListener('transitionend', e => {
  popupWindow.hide()
})

ipcRenderer.on('set-styling', (e, props) => {
  for (let key in props) {
    elm.style[key] = props[key]
  }
})

elm.addEventListener('mouseleave', e => {
  elm.innerHTML = '';
  popupWindow.hide();
})

ipcRenderer.on('set-content', (e, details) => {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
  const { config, title, content, elmDimensions, originalWinBounds } = details

  if (parseInt(config.width) > 0) {
    elm.style.maxWidth = `${parseInt(config.width)}px`
    elm.style.whiteSpace = 'normal'
  } else {
    elm.style.maxWidth = 'none'
    elm.style.whiteSpace = 'nowrap'
  }

  elm.style.opacity = 1;
  elm.style.transform = 'scale3d(1, 1, 1)'
  elm.classList.add(`position-${config.position}`)
  elm.innerHTML = content

  popupWindow.setContentSize(elm.clientWidth + 12, elm.clientHeight + 12)
  var elmOffsetLeft = Math.round(originalWinBounds.x + elmDimensions.left)
  var elmOffsetTop = Math.round(originalWinBounds.y + elmDimensions.top)

  var posT = elmOffsetTop - popupWindow.getContentSize()[1] - Math.max(0, config.offset)
  var posL = elmOffsetLeft - (Math.round((popupWindow.getContentSize()[0] - elmDimensions.width) / 2)) + popupWindow.getContentSize()[0] / 2

  if (posT < 0) {
    posT = 0 - elmDimensions.height / 2;
  }
  if ((posL + popupWindow.getContentSize()[0]) > width) {
    posL = width - popupWindow.getContentSize()[0] + elmDimensions.width / 2;
  }

  let positions = {

    top() {
      const top = posT;
      return [this.horizontalCenter(), top]
    },

    horizontalCenter() {
      const left = posL;
      return left;

    },

    verticalCenter() {
      return elmOffsetTop - (Math.round((popupWindow.getContentSize()[1] - elmDimensions.height) / 2))
    }
  }

  const getPosition = positions[config.position]()
  popupWindow.setPosition(...getPosition)
  popupWindow.setAlwaysOnTop(true);
  popupWindow.focus();
  popupWindow.setAlwaysOnTop(false);

  process.nextTick(() => {
    popupWindow.showInactive()
  })
})

