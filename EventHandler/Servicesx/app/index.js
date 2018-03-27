'use strict';

const App = require('./App');

const app = function (options) {
  return function () {
    return new App(options);
  };
};

module.exports = app;
