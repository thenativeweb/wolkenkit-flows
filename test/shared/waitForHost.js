'use strict';

const { parse } = require('url');

const knock = require('knockat');

const waitFor = async function (url) {
  if (!url) {
    throw new Error('Url is missing.');
  }

  const service = parse(url);

  await knock.at(service.hostname, service.port);
};

module.exports = waitFor;
