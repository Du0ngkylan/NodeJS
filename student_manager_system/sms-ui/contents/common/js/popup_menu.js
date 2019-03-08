'use strict';

$(function() {
  PopupMenu.createPopupTip();
  StaticTooltip.create();
});

$(document).click(function(e) {
  // cancel popup wait if mouse clicked
  PopupMenu.cancelDelay();

  let elem = $(e.target);
  if (elem) {
    if (PopupMenu.onPopupMenu(elem)) {
      return;
    }
  }

  PopupMenu.hide();
});

$(document).mousemove(function(e) {
  // cancel popup wait if mouse moved
  PopupMenu.cancelDelay();

  // mouse coordinate
  let mousePointer = new _Point(e.clientX, e.clientY);

  let elem = $(e.target);
  if (elem) {
    if (PopupMenu.onPopupMenu(elem)) {
      return;
    }

    if (!PopupMenu.getDisplaying()) {
      let popupId = elem.attr('data-popupid');
      if (popupId) {
        PopupMenu.delayPopup(mousePointer, popupId);
      }
    }
    else {
      PopupMenu.hide(mousePointer);
    }
  }
});

var StaticTooltip = (function() {
  function _create() {
    let numberingTooltipId = 1;
    $('[data-tooltip]').each(function() {
      let elem = $(this);
      let caption = elem.attr('data-tooltip');
      if (caption) {
        let tooltipId = 'static_tooltip_' + numberingTooltipId;
        elem.attr('data-statictooltipid', tooltipId);

        let html = '<div id="' + tooltipId + '" class="tooltip">' + caption + '</div>';
        $('body').append(html);

        numberingTooltipId++;
      }
    });

    // register static tooltip event
    _registerEvent('data-statictooltipid');
  }

  function _registerEvent(customeDataName) {
    $('[' + customeDataName + ']').each(function() {
      // add mouseover event listener
      this.addEventListener('mouseover', (e) => {
        e.preventDefault();

        // show hovered tooltip and set position
        let elem = $(this);
        let tooltipId = elem.attr(customeDataName);
        let tooltip = $('#' + tooltipId);
        if (tooltip) {
          // get parent's position of tooltip
          let parentRect = this.getBoundingClientRect();
          let parentHeight = parentRect.height;
          let parentWidth = parentRect.width;
          let parentTop = parentRect.top;
          let parentLeft = parentRect.left;

          // get full width of tooltip
          let tooltipWidth = tooltip.outerWidth(true);

          // set position before show
          let tooltipTop = parentTop + parentHeight + 5;
          let tooltipLeft = parentLeft - Math.round(tooltipWidth * 0.5) + Math.round(parentWidth * 0.5);
          tooltip.css('top', tooltipTop);
          tooltip.css('left', tooltipLeft);
          tooltip.show();
        }
      }, false);

      // add mouseout event listener
      this.addEventListener('mouseout', (e) => {
        e.preventDefault();

        // hide all tooltip
        $('.tooltip').hide();
      });

      // add click event listener
      this.addEventListener('click', (e) => {
        e.preventDefault();

        // hide all tooltip
        $('.tooltip').hide();
      });
    });
  }

  return {
    create: _create,
    registerEvent: _registerEvent
  };
}());

var PopupMenu = (function() {
  // time until popup is displayed
  const DELAY_MILLI_SECONDS = 1600;
  // popup top adjustment starts from mouse pointer
  const ADJUST_TOP = -15;
  // popup left adjustment starts from mouse pointer
  const ADJUST_LEFT = 15;
  // MUST adjustment if edit ADJUST_*
  const ALLOW_DIST = 23;
  // icon size
  const ICON_SIZE_LARGE = 'large';
  const ICON_SIZE_MEDIUM = 'medium';
  const ICON_SIZE_SMALL = 'small';

  let _delayTimer;
  let _items = {};
  let _numbering = 0;
  let _settings = {
    enableTitle: true,
    enableMenu: true,
    iconSize: ICON_SIZE_MEDIUM
  }

  function _delayPopup(mousePointer, popupId) {
    _cancelDelay();

    if (!_settings.enableTitle && !_settings.enableMenu) {
      return;
    }

    if (!_settings.enableTitle && !_hasMenu(popupId)) {
      return;
    }

    _delayTimer = setTimeout(
      function() {
        let elem = $('#' + popupId);
        let height = parseInt(elem.height());
        let top = mousePointer.y - height;
        let left = mousePointer.x;
        elem.css('top', top + ADJUST_TOP);
        elem.css('left', left + ADJUST_LEFT);
        elem.show();
      }, DELAY_MILLI_SECONDS);
  }

  function _cancelDelay() {
    clearTimeout(_delayTimer);
  }

  function _hasMenu(popupId) {
    let has = false;
    let elem = $('[data-popupid="' + popupId + '"]');
    if (elem && elem.attr('data-popupmenu')) {
      has = true;
    }
    return has;
  }

  function _getDisplaying() {
    let disp;
    $('.popup_menu').each(function() {
      let elem = $(this);
      if (elem.css('display') != 'none') {
        disp = elem;
      }
    });
    return disp;
  }

  function _onPopupMenu(elem) {
    let onPopupMenu =
      elem.hasClass('popup_menu') ||
      elem.parent().hasClass('popup_menu') ||
      elem.parent().parent().hasClass('popup_menu');
    return onPopupMenu;
  }

  function _hide(mousePointer) {
    let elem = _getDisplaying();
    if (!elem) {
      return;
    }

    // case displaying icon
    let popupId = elem.attr('id');
    let iconDisplay = $('#' + popupId + ' .popup_menu_row').css('display');
    if (
      iconDisplay &&
      iconDisplay != 'none' &&
      mousePointer) {
      _hideIfOutOfRange(elem, mousePointer);
      return;
    }

    // case displaying only title (or clicked parent)
    _hideIfMouseMove(elem);
  }

  function _hideIfOutOfRange(elem, mousePointer) {
    let height = parseInt(elem.height());
    let top = parseInt(elem.css('top'));
    let left = parseInt(elem.css('left'));
    let popupCoords = new _Point(left, height + top);
    let dist =
      _getDistance(mousePointer, popupCoords);
    if (ALLOW_DIST < dist) {
      elem.hide();
    }
  }

  function _hideIfMouseMove(elem) {
    elem.hide();
  }

  function _getDistance(point1, point2) {
      let difX = point1.x - point2.x;
      let difY = point1.y - point2.y;
      let res = Math.hypot(difX, difY);
      return res;
  }

  /*
   * CAN NOT re-register
   */
  function _register(items) {
    _items = items;

    // _createPopupTip() will be executed first
    _createPopup();
  }

  function _createPopup() {
    // create menu html
    $('[data-popupmenu]').each(function() {
      let elem = $(this);
      let itemsKey =  elem.attr('data-popupmenu');
      if (itemsKey) {
        let popupNumbering = _numberingPopupId();
        let popupId = 'popup_menu_' + popupNumbering;
        elem.attr('data-popupid', popupId);

        let html = '<div class="popup_menu" id="' + popupId + '">';
        let title = elem.attr('data-popuptitle');
        if (title) {
          html += '<div class="title">';
          html += title;
          html += '</div>';
        }

        let menu = _items[itemsKey];
        for (let i = 0; i < menu.length; i++) {
          var itemsRow = menu[i];

          html += '<div class="popup_menu_row">';
          for (let j = 0; j < itemsRow.length; j++) {
            let itemsCol = itemsRow[j];

            let tooltipId = 'tooltip_' + popupNumbering + '_' + (i + 1) + '_' + (j + 1);
            let sizeKey = _getKeyIconSize();
            let img = itemsCol[sizeKey];
            html += '<img data-tooltipid="' + tooltipId + '" src="' + img + '" onclick="' + itemsCol.click.name + '();">';

            if (itemsCol.icon_tip) {
              // static tooltip
              html += '<div id="' + tooltipId + '" class="tooltip">' + itemsCol.icon_tip + '</div>';
            }
          }
          html += '</div>';
        }
        html += '</div>';
        $('body').append(html);
      }
    });

    // register static tooltip event
    StaticTooltip.registerEvent('data-tooltipid');
  }

  function _createPopupTip() {
    // create title only menu html
    $('[data-popuptitle]').each(function() {
      let elem = $(this);
      let itemsKey = elem.attr('data-popupmenu');
      if (!itemsKey) {
        let popupId = 'popup_menu_' + _numberingPopupId();
        elem.attr('data-popupid', popupId);

        let html = '<div class="popup_menu" id="' + popupId + '">';

        let title = elem.attr('data-popuptitle');
        html += '<div class="title">';
        html += title;
        html += '</div>';

        html += '</div>';
        $('body').append(html);
      }
    });
  }

  function _displayPopup(enable) {
    _displayTitle(enable);
    _displayMenu(enable);
  }

  function _displayTitle(enable) {
    _settings.enableTitle = enable;
    let disp = enable ? 'block' : 'none';

    $('[data-popupid]').each(function() {
      let elem = $(this);
      let popupId = elem.attr('data-popupid');
      let title = $('#' + popupId + ' .title');
      if (title) {
        title.css('display', disp);
      }
    });
  }

  function _displayMenu(enable) {
    _settings.enableMenu = enable;
    let disp = enable ? 'block' : 'none';

    $('[data-popupid]').each(function() {
      let elem = $(this);
      let popupId = elem.attr('data-popupid');
      let menus = $('#' + popupId + ' .popup_menu_row');
      if (menus) {
        menus.css('display', disp);
      }
    });
  }

  function _setIconSize(iconSize) {
    _settings.iconSize = iconSize;

    // create menu html
    $('[data-popupmenu]').each(function() {
      let elem = $(this);
      let itemsKey =  elem.attr('data-popupmenu');
      if (itemsKey) {
        let popupId = elem.attr('data-popupid');
        let popupNumbering = popupId.replace('popup_menu_', '');

        let menu = _items[itemsKey];
        for (let i = 0; i < menu.length; i++) {
          var itemsRow = menu[i];

          for (let j = 0; j < itemsRow.length; j++) {
            let itemsCol = itemsRow[j];

            let sizeKey = _getKeyIconSize();
            let img = itemsCol[sizeKey];

            let tooltipId = 'tooltip_' + popupNumbering + '_' + (i + 1) + '_' + (j + 1);
            $('[data-tooltipid="' + tooltipId + '"]').attr('src', img);
          }
        }
      }
    });
  }

  function _getKeyIconSize() {
    let key = 'medium_icon_src';
    if (_settings.iconSize == ICON_SIZE_LARGE) {
      key = 'large_icon_src';
    }
    else if (_settings.iconSize == ICON_SIZE_SMALL) {
      key = 'small_icon_src';
    }
    return key;
  }

  function _numberingPopupId() {
    return ++_numbering;
  }

  return {
    ICON_SIZE_LARGE: ICON_SIZE_LARGE,
    ICON_SIZE_MEDIUM: ICON_SIZE_MEDIUM,
    ICON_SIZE_SMALL: ICON_SIZE_SMALL,
    delayPopup: _delayPopup,
    cancelDelay: _cancelDelay,
    getDisplaying: _getDisplaying,
    onPopupMenu: _onPopupMenu,
    hide: _hide,
    register: _register, /* CAN NOT re-register */
    createPopupTip: _createPopupTip,
    displayPopup: _displayPopup,
    displayTitle: _displayTitle,
    displayMenu: _displayMenu,
    setIconSize: _setIconSize
  };
}());

let _Point = function(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
}
