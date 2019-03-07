var keyStore = {
  key: null,
  getKey: function () {
    return this.key;
  },
  setKey: function (setKey) {
    this.key = setKey;
  }
}

function inputFunc(inputThis, event) {
  let dateString = inputThis.value;
  // checkFormatDate(dInput)
  let key = keyStore.getKey();
  let result = checkFormatDate(dateString, key);
  let check_err = result.check_err;
  if (check_err) {
    $(inputThis).val(result.new_date);
    let curPos = result.cur_pos;
    inputThis.setSelectionRange(curPos, curPos)
  } else {
    inputThis.setAttribute('selection', inputThis.selectionStart);
  }
}

function keyUpFunc(inputThis, event) {
  // console.log("key up")
  let dateString = inputThis.value;
  let cursorPosition = $(inputThis).prop("selectionStart");
  // console.log("keyup: dateString: "+dateString+";cursorPosition: "+cursorPosition)
  let isNext = 0;
  let isUp = 0;
  let actions = [37, 38, 39, 40]
  if (event.keyCode == 37) {
    dateString = inputThis.value;
    isNext = -1
  } else if (event.keyCode == 39) {
    dateString = inputThis.value;
    isNext = 1
  } else if (event.keyCode == 38) {
    dateString = inputThis.value;
    isUp = 1
  } else if (event.keyCode == 40) {
    dateString = inputThis.value;
    isUp = -1
  }
  if (actions.includes(event.keyCode)) {
    let result = selectTextAndFormatDate(cursorPosition, dateString, isNext, isUp);
    $(inputThis).val(result.new_date);
    inputThis.setSelectionRange(result.start_select, result.end_select);
    inputThis.focus();
  }
}

function keyDownFunc(inputThis, event) {
  if ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)) {
    keyStore.setKey(event.key);
  } else {
    event.preventDefault();
  }
}

function clickInputFunc(inputThis, event) {
  let cursorPosition = $(inputThis).prop("selectionStart");
  setTimeout (function () {
    inputThis.setAttribute('selection', inputThis.selectionStart);
  }, 0);
  let dateString = $(inputThis).val();
  // console.log("cursorPosition: " + cursorPosition);
  let result = selectTextAndFormatDate(cursorPosition, dateString)
  $(inputThis).val(result.new_date);
  inputThis.setSelectionRange(result.start_select, result.end_select);
  inputThis.focus();
}

function focusoutFunc(inputThis, event) {
  let dateString = $(inputThis).val();
  let date = convertFormatDate(dateString);
  $(inputThis).val(date);
}

function selectTextAndFormatDate(cursorPosition, dateString, isNext = 0, isUp = 0) {
  let startSelect = 0;
  let endSelect = 0;

  let dateObj = new Date();
  let curMonth = dateObj.getUTCMonth() + 1; //months from 1-12
  let curDay = dateObj.getUTCDate();
  let curYear = dateObj.getUTCFullYear();
  let parts = dateString.split("/");
  let day = parts[2];
  let month = parts[1];
  let year = parts[0];
  if (year.length == 2) {
    year = "20" + year;
    cursorPosition += 2;
  } else if (year.length == 1) {
    year = "200" + year;
    cursorPosition += 1;

  } else if (year.length == 3) {
    year = curYear;
    cursorPosition += 1;
  }
  if (month.length == 1) {
    month = "0" + month;
    cursorPosition += 1;
  }
  if (day.length == 1) {
    day = "0" + day;
    cursorPosition += 1;
  }

  let yearLen = year.length;
  let monthLen = yearLen + 1 + month.length;
  let dayLen = monthLen + 1 + day.length;

  let intYear = parseInt(year);
  let intDay = parseInt(day);
  let intMonth = parseInt(month);

  let monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Adjust for leap years
  if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)) {
    monthLength[1] = 29;
  }
  let maxDay = monthLength[intMonth - 1]
  if (cursorPosition >= 0 && cursorPosition <= yearLen) {
    // when user click year position
    // check press arrowleft (isNext =-1), arrow right (isNext = 1)
    if (isNext == 0) {
      startSelect = 0;
      endSelect = yearLen;
    } else if (isNext == 1) {
      startSelect = yearLen + 1;
      endSelect = monthLen;
    } else {
      startSelect = monthLen + 1;
      endSelect = dayLen;
    }
    // check press arrowup (isUp = 1 ). arrowdown (isUp = -1)
    if (isUp == 1) {
      intYear = intYear + 1;
      year = intYear.toString();
    } else if (isUp == -1) {
      if (year < 1) {
        intYear = 0;
      } else {
        intYear = intYear - 1;
      }
      year = intYear.toString();
    }
  } else if (cursorPosition > yearLen && cursorPosition <= monthLen) {
    // when user click month position
    // check press arrowleft (isNext = -1), arrow right (isNext = 1)
    if (isNext == 0) {
      startSelect = yearLen + 1;
      endSelect = monthLen;
    } else if (isNext == 1) {
      startSelect = monthLen + 1;
      endSelect = dayLen;
    } else {
      startSelect = 0;
      endSelect = yearLen;
    }
    // check press arrowup (isUp = 1 ). arrowdown (isUp = -1)
    if (isUp == 1) {
      if (month < 12) {
        intMonth = intMonth + 1;
      } else {
        intMonth = 1;
      }
      month = intMonth.toString();
    } else if (isUp == -1) {
      if (month > 1) {
        intMonth = intMonth - 1;
      } else {
        intMonth = 12;
      }
      month = intMonth.toString();
    }
    maxDay = monthLength[intMonth - 1]
    if (intDay > maxDay) {
      intDay = maxDay;
      day = intDay.toString();
    }
  } else {
    // when user click day position
    // check press arrowleft (isNext = -1), arrow right (isNext = 1)
    if (isNext == 0) {
      startSelect = monthLen + 1;
      endSelect = dayLen;
    } else if (isNext == 1) {
      startSelect = 0;
      endSelect = yearLen;
    } else {
      startSelect = yearLen + 1;
      endSelect = monthLen;
    }
    // check press arrowup (isUp = 1 ). arrowdown (isUp = -1)
    if (isUp == 1) {
      if (intDay < maxDay) {
        intDay = intDay + 1
        day = intDay.toString();
      } else {
        day = 1;
      }
    } else if (isUp == -1) {
      if (intDay > 1) {
        intDay = intDay - 1
      } else {
        intDay = maxDay;
      }
      day = intDay.toString();
    }
  }
  // if user type 0 for month or year or day => it will be changed equal same current
  if (intYear == 0) {
    year = curYear;
  }
  if (intDay == 0) {
    day = curDay;
  }
  if (intMonth == 0) {
    month = curMonth;
  }
  // valide day, month

  if (month.length == 1) {
    month = "0" + month;
  }
  if (day.length == 1) {
    day = "0" + day;
  }

  let date = year + "/" + month + "/" + day;
  return {
    "new_date": date,
    "start_select": startSelect,
    "end_select": endSelect
  }
}

function checkFormatDate(dateString, key = null) {
  // console.log("checkFormatDate: date string: " + dateString)
  let parts = dateString.split("/");
  let day = parts[2];
  let month = parts[1];
  let year = parts[0];

  let yearLen = year.length;
  let monthLen = yearLen + 1 + month.length;
  let dayLen = monthLen + 1 + day.length;

  let monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Adjust for leap years
  if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)) {
    monthLength[1] = 29;
  }
  let checkError = false;
  let cursorPosition = 0;
  if (year.length > 4) {
    checkError = true;
    cursorPosition = 1;
    year = key;
  }
  if (month.length > 2 || parseInt(month) > 12) {
    checkError = true;
    cursorPosition = yearLen + 2;
    month = key;

  }
  let monthIndex = parseInt(month) - 1;
  if (day.length > 2 || parseInt(day) > monthLength[monthIndex]) {
    checkError = true;
    cursorPosition = monthLen + 2;
    day = key;
  }
  let new_date = year + "/" + month + "/" + day;
  return {
    "check_err": checkError,
    "cur_pos": cursorPosition,
    "new_date": new_date
  }
}

function mouseupInDocumentFunc(inputDateJquery, event) {
  if (!inputDateJquery.is(':focus')){
    return;
  }
  // [0] because using jquery
  let inputDate = inputDateJquery[0];
  var startPos = inputDate.selectionStart;
  var endPos = inputDate.selectionEnd;

  let dateString = inputDateJquery.val();
  let date = convertFormatDate(dateString);
  inputDateJquery.val(date);

  if(date !== dateString){
    startPos=0;
  }
  // console.log("startPos: "+startPos +"; endpos: "+endPos);
  if (0 <= startPos && startPos <= 4) {
    start = 0;
    end = 4;
  } else if (5 <= startPos && startPos <= 7) {
    start = 5;
    end = 7;
  }else if (8 <= startPos && startPos <= 10){
    start = 8;
    end = 10;
  }
  inputDate.setSelectionRange(start, end);
}

function convertFormatDate(dateString){
  let dateObj = new Date();
  let curMonth = dateObj.getUTCMonth() + 1; //months from 1-12
  let curDay = dateObj.getUTCDate();
  let curYear = dateObj.getUTCFullYear();

  let parts = dateString.split("/");
  let day = parts[2];
  let month = parts[1];
  let year = parts[0];
  if (year.length == 2) {
    year = "20" + year;
  } else if (year.length == 1) {
    year = "200" + year;
  } else if (year.length == 3) {
    year = curYear;
  } else if(year.length == 4 && year == "0000") {
    year = curYear;
  }
  
  if (month && month.length == 1 && month != "0") {
    month = "0" + month;
  } else if(month && month.length == 2 && month != "00") {
    month = month;
  } else {
    month = "0" + curMonth;
  }
  
  if (day && day.length == 1 && day != "0") {
    day = "0" + day;
  } else if(day && day.length == 2 && day != "00") {
    day = day;
  } else {
    day = curDay;
  }
  let date = year + "/" + month + "/" + day;
  return date;
}

function compositionstartFunc (inputThis, event) {
  let originValue = $(inputThis).val();
  if(!inputThis.getAttribute('selection') && inputThis.getAttribute('selection') !== 0) {
    inputThis.setAttribute('selection', inputThis.selectionStart);
  }
  $(inputThis).on('input', function (evt) {
    if (!/^[0-9/]$/g.test(evt.originalEvent.data)) {
      inputThis.value = originValue;
      if (inputThis.getAttribute('selection') > -1) {
        setTimeout(function () {
          evt.target.setSelectionRange(inputThis.getAttribute('selection'), inputThis.getAttribute('selection'));
        }, 0, evt);
      }
    }
  });
}