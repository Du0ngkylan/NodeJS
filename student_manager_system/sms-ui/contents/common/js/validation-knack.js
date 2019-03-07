const circles = [
  {key: '①',value: '(1)'},
  {key: '②',value: '(2)'},
  {key: '③',value: '(3)'},
  {key: '④',value: '(4)'},
  {key: '⑤',value: '(5)'},
  {key: '⑥',value: '(6)'},
  {key: '⑦',value: '(7)'},
  {key: '⑧',value: '(8)'},
  {key: '⑨',value: '(9)'},
  {key: '⑩',value: '(10)'},
  {key: '⑪',value: '(11)'},
  {key: '⑫',value: '(12)'},
  {key: '⑬',value: '(13)'},
  {key: '⑭',value: '(14)'},
  {key: '⑮',value: '(15)'},
  {key: '⑯',value: '(16)'},
  {key: '⑰',value: '(17)'},
  {key: '⑱',value: '(18)'},
  {key: '⑲',value: '(19)'},
  {key: '⑳',value: '(20)'}
];

function convertCircleNumber(param) {
  let arrParams = param.split("");
  let result = "";
  for (let i = 0; i < arrParams.length; i++) {
    let existCircle = circles.find( circle => circle.key === arrParams[i] );
    if (existCircle) {
      result += existCircle.value;
    } else {
      result += arrParams[i];
    }
  }
  return result;
}

function validateUnicodeAndCircleNumber(param) {
  let arrParams = param.split("");
  for (let i = 0; i < arrParams.length; i++) {
    let existCircle = circles.some( function (circle) {
      return circle.key === arrParams[i];
    });
    if (!(existCircle || arrParams[i].match(/[一-龯ぁ-んァ-ンｧ-ﾝﾞﾟＡ-ｚ０-９0-9a-zA-Z<>/ー（）()・　\n]/))) {
      return false;
    }
  }
  return true;
}

// massege dialog
async function _msgDialog(msg) {
  await goyoDialog.showWarningMessageDialog(
    remote.getCurrentWindow(), 'エラー',
    msg,
    'OK');
};
// Banned characters check
async function _BanCharaCheck(inputResult, nameField, design = 0) {
  let value = await goyoKinsoku.isCheckUsableChara(inputResult);
  if(!value.check) {
    if (design == 0) {
      errormsg = ERRORMESSAGE['' + nameField + ''].preventStart + value.kinsokuChara + ERRORMESSAGE['' + nameField + ''].preventEnd;
    } else {
      errormsg = ERRORMESSAGE['' + nameField + ''].preventDesignStart +  value.kinsokuChara + ERRORMESSAGE['' + nameField + ''].preventEnd;
    }
    _msgDialog(errormsg);
    return false;
  }
};

// Check characters input
function inputCheck(name, year = false, lengthCheck = false, notify = false, longitude = null) {
  let copoEnd;
  $(name).keypress(function (evt) {
    if (tooltipInstance != undefined) {
      tooltipInstance.destroy();
    }
    let charCode = (evt.which) ? evt.which : evt.keyCode;
    if(longitude == "longitude") {
      if (charCode !== 45 && charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
      }
    } else {
      if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        if(notify) {
          tooltipInstance = ngTooltipDisplay(name);
        }
        return false;
      }
    }
    return true;
  });
  $(name).on('compositionstart', function (evt) {
    if (tooltipInstance != undefined) {
      tooltipInstance.destroy();
    }
    copoEnd = "compositionstart";
  });
  $(name).on('compositionend', function (evt) {
    let charSp = $(this).val().split('');
    for(let i = 0; i < charSp.length; i++) {
      if(longitude == "longitude"){
        if ((/[^０-９\0-9]/g.test(charSp[i])) || (/[\u002F\u002A\u002B\u0021\u0023\u0024\u0025\u0026\u0028\u0029\u0027\u002E\u3000\u0020]/g.test(charSp[i])) ) {
          let replace = $(this).val().replace(charSp[i], "");
          $(this).val(replace);
        }
      } else {
        if ((/[^０-９\0-9]/g.test(charSp[i])) || (/[\u002F\u002A\u002D\u002B\u0021\u0023\u0024\u0025\u0026\u0028\u0029\u0027\u002E\u3000\u0020]/g.test(charSp[i])) ) {
          let replace = $(this).val().replace(charSp[i], "");
          if(notify) {
            tooltipInstance = ngTooltipDisplay(name);
          }
          $(this).val(replace);
        }
      }
      if(lengthCheck) {
        if(charSp[i].jlength() > 1) {
          $(this).val($(this).val().replace(charSp[i], ""));
        }
      }
    }
    if(year){
      if ($(this).val().jlength() > 4) {
        let acceptYear = $(this).val().substr(0, 2);
        $(this).val(acceptYear);
      }
    }
    copoEnd = "compositionend";
  });
  $(document).on('keyup', name, function (evt) {
    if(copoEnd != "compositionstart"){
      if (/[\u3000\u0020]/g.test($(this).val())) {
        $(this).val($(this).val().replace(/[\u3000\u0020]/g, ""));
        if(notify) {
          tooltipInstance = ngTooltipDisplay(name);
        }
        copoEnd = "input";
      }
    }
  });
};