function initCursor(document){
  let body = document.querySelectorAll('body');
  if(body.length > 0){
    for(let i=0;i < body.length;i++){
      body[i].classList.add('goyo-cursor-finger-five');
    }
  }
  let grid = document.querySelectorAll('.ui-jqgrid');
  if(grid.length > 0){
    for(let i=0;i < grid.length;i++){
      grid[i].classList.add('cursor_default');
    }
  }
  let datepicker = document.querySelectorAll('.ui-datepicker');
  if(datepicker.length > 0){
    for(let i=0;i < datepicker.length;i++){
      datepicker[i].classList.add('cursor_default');
    }
  }
  let button  = document.querySelectorAll('button');
  if(button.length > 0){
    for(let i=0;i < button.length;i++){
      button[i].classList.add('goyo-cursor-mommy-finger');
    }
  }
  let textarea  = document.querySelectorAll('textarea');
  if(textarea.length > 0){
    for(let i=0;i < textarea.length;i++){
      textarea[i].classList.add('cursor_text');
    }
  }
  let inputText = document.querySelectorAll('input[type="text"]');
  if(inputText.length > 0){
    for(let i=0;i < inputText.length;i++){
      inputText[i].classList.add('cursor_text');
    }
  }
  
  let inputs  = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  if(inputs.length > 0){
    for(let i=0;i < inputs.length;i++){
      inputs[i].classList.add('goyo-cursor-mommy-finger');
    }
  }
  // set cursor pointer
  let cursorPointerCommon = document.querySelectorAll('a, label, .knack-detail-clickable, .cursor_pointer');
  if(cursorPointerCommon.length > 0){
    for(let i=0;i < cursorPointerCommon.length;i++){
      cursorPointerCommon[i].classList.add('goyo-cursor-mommy-finger');
    }
  }
}