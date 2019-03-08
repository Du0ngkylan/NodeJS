'use strict';

var windowControl = require('electron').remote.require('./lib/windowControl');

// bookrack_window
function load_bookrack_window(){
  windowControl.showBookrackWindow();
};

// bookrack_operation_window
function load_bookrackoperation_window(){
  windowControl.showBookrackOperationWindow();
};

// photo_view_window
function load_photoview_window(){
  windowControl.showphotoviewwindow();
};

// information_window
function load_information_window(){
  windowControl.showinformationwindow();
};

