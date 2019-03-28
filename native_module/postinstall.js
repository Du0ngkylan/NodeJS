'use strict';

const fs = require('fs');
const path = require('path');

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'NativeUI.node'),
  path.join(__dirname, 'NativeUI.node'));

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'Printing.node'),
  path.join(__dirname, 'Printing.node'));

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'ColorPicker.node'),
  path.join(__dirname, 'ColorPicker.node'));