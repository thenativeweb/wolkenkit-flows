'use strict';

const shell = require('shelljs');

const post = async function () {
  shell.exec('docker kill postgres-units; docker rm -v postgres-units');
};

module.exports = post;
