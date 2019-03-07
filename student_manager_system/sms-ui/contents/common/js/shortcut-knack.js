var arrTabElem = [];

function initTabShortcut(pageElem) {
  pageElem.querySelectorAll('span.select_focus').forEach(element => {
    $(element).remove();
  });
  arrTabElem = _getArrElem(pageElem);
  _tabFunc(arrTabElem);
  $(arrTabElem[0]).focus();
}

function _getArrElem(pageElem) {
  let arrResult = [];
  let radio = [];
  let tabElem = pageElem.querySelectorAll('textarea, select, input, button, table[id] ');
  for (let index = 0; index < tabElem.length; index++) {
    const element = tabElem[index];
    element.addEventListener('focusout', (e) => {
      switch (e.target.nodeName) {
        case 'INPUT':
          switch (e.target.type) {
            case 'radio':
            case 'checkbox':
              $(e.target).next().removeClass('boder_focus');
              break;
          }
          break;
        case 'BUTTON':
          e.target.classList.remove('button_focus');
          break;
        case 'SELECT':
          if ($(e.target).next().hasClass('select_focus')) {
            $(e.target).next().remove()
          }
          break;
        case 'TABLE':
          if (e.target.querySelector('tr')) {
            e.target.querySelectorAll('tr').forEach((trElem) => {
              trElem.classList.remove('tr_focus');
              trElem.classList.remove('tr_focus_before');
            });
          }
          break;
      }
    })
    if (element.nodeName === 'BUTTON' && tabElem[index + 1].nodeName === 'TABLE') {
      tabElem[index + 1].addEventListener('focusout', (e) => {
        if (e.target.querySelector('tr')) {
          e.target.querySelectorAll('tr').forEach((trElem) => {
            trElem.classList.remove('tr_focus');
            trElem.classList.remove('tr_focus_before');
          });
        }
      })
      arrResult.push(tabElem[index + 1]);
      index++;
    }
    if (element.className.indexOf('combobox-select') > -1 || !$(element).is(':visible')) {
      continue;
    }
    if (element.nodeName === 'INPUT' && element.type === 'radio') {
      if (radio.indexOf(element.name) > -1) {
        continue;
      } else {
        radio.push(element.name);
      }
    }
    arrResult.push(element);
  }
  return arrResult;
}

function _tabFunc(arrTabElem) {
  for (const elem of arrTabElem) {
    let index = arrTabElem.indexOf(elem);
    elem.addEventListener('keydown', (e) => {
      let keyCode = e.keyCode || e.which;
      if (keyCode === 9) {
        e.preventDefault();
        if (e.shiftKey) {
          if (index === 0) {
            _setEffect(arrTabElem.length -1);
          } else {
            _setEffect(index - 1);
          }
        } else {
          if (index === arrTabElem.length - 1) {
            _setEffect(0);
          } else {
            _setEffect(index + 1);
          }
        }
      }
    })
  }
}

function _setEffect(newSelect) {
  let elemSelected = arrTabElem[newSelect];
  $(elemSelected).focus();
  switch (elemSelected.nodeName) {
    case 'INPUT':
      switch (elemSelected.type) {
        case 'checkbox':
          $(elemSelected).next().addClass('boder_focus');
          break;
        case 'radio':
          let radioChecked = document.querySelector(`input[name="${elemSelected.name}"]:checked`);
          $(radioChecked).next().addClass('boder_focus');
          $(radioChecked).focus();
          break;
        default:
          if (elemSelected.className.indexOf('hasDatepicker') > -1) {
            elemSelected.setSelectionRange(0,4);
          } else {
            elemSelected.select();
          }
          break;
      }
      break;
    case 'TABLE':
      let trArr = elemSelected.querySelectorAll('tr');
      let trBefore = -1;
      for (let index = 0; index < trArr.length; index++) {
        const trElem = trArr[index];
        for (let i = 0; i < trElem.querySelectorAll('td').length; i++) {
          const tdElem = trElem.querySelectorAll('td')[i];
          if (tdElem.style.height == '0px'
            || tdElem.title
            || tdElem.innerHTML !== '&nbsp;'
            || (tdElem.querySelector('input')
            && tdElem.querySelector('input').value)) {
              if (tdElem.style.height !== '0px' && i === 0) trBefore = index;
              break;
          }
          if (i === trElem.querySelectorAll('td').length - 1) {
            trElem.className += ' tr_focus';
            if (trArr[trBefore]) {
              trArr[trBefore].className += ' tr_focus_before';
            }
            index = trArr.length;
            break;
          }
        }
        if (index === trArr.length - 1) {
          trArr[index].className += ' tr_focus_before';
        }
      }
      break;
    case 'BUTTON':
      elemSelected.className += ' button_focus';
      break;
    case 'SELECT':
      if(!elemSelected.nextElementSibling || elemSelected.nextElementSibling.nodeName !== 'SPAN') {
        let eleDiv = document.createElement('span');
        eleDiv.className += ' select_focus';
        let selectH = window.getComputedStyle(elemSelected).getPropertyValue('height');
        let selectW = window.getComputedStyle(elemSelected).getPropertyValue('width');
        eleDiv.style.height = `calc(${selectH} - 8px)`;
        eleDiv.style.width = `calc(${selectW} - 22px)`;
        eleDiv.style.marginLeft = `calc(4px - ${selectW})`;
        $(elemSelected).after(eleDiv);
      }
      break;
    case 'TEXTAREA':
      elemSelected.select();
      break;
  }
}

function setBorder(pageElem) {
  document.addEventListener('keydown', (e) => {
    let keyCode = e.keyCode || e.which;
    if (keyCode === 9) {
      let radioChecked = pageElem.querySelector(`input[type=radio]:checked`);
      $(radioChecked).next().addClass('boder_focus');
    }
  })
  let tabElem = pageElem.querySelectorAll('input');
  for (let index = 0; index < tabElem.length; index++) {
    const element = tabElem[index];
    $(element).next().removeClass('boder_focus');
    element.addEventListener('change', (e) => {
      tabElem.forEach( elem => {
        if (!elem.checked) {
          $(elem).next().removeClass('boder_focus');
        } else {
          $(elem).next().addClass('boder_focus');
        }
      })
    })
  }
}
