'use strict';

const shell = require('shelljs');

const post = async function () {
  shell.exec('docker kill postgres-performance; docker rm -v postgres-performance');
};

module.exports = post;
