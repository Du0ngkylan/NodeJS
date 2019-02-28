'use strict';

const fs = require('fs');
const path = require('path');

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'GoyoNativeUI.node'),
  path.join(__dirname, 'GoyoNativeUI.node'));

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'GoyoPrinting.node'),
  path.join(__dirname, 'GoyoPrinting.node'));

fs.copyFileSync(
  path.join(__dirname, 'build', 'Release', 'GoyoColorPicker.node'),
  path.join(__dirname, 'GoyoColorPicker.node'));