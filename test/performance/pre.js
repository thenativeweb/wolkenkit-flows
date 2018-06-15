'use strict';

const oneLine = require('common-tags/lib/oneLine'),
      shell = require('shelljs');

const env = require('../shared/env'),
      waitForPostgres = require('../shared/waitForPostgres');

const pre = async function () {
  shell.exec(oneLine`
    docker run
      -d
      -p 5435:5432
      -e POSTGRES_DB=wolkenkit
      -e POSTGRES_USER=wolkenkit
      -e POSTGRES_PASSWORD=wolkenkit
      --name postgres-performance
      thenativeweb/wolkenkit-postgres:latest
  `);

  await waitForPostgres({ url: env.POSTGRES_URL_PERFORMANCE });
};

module.exports = pre;
