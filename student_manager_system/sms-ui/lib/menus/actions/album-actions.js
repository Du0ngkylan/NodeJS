'use strict';

// Node.js modules.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Electron modules.
const { app, nativeImage } = require('electron');

// Goyo modules.
const bookrackAccessor = require('sms-accessor');
const {
  viewMode,
  BookrackViewWindowSet
} = require('../../goyo-window-controller');