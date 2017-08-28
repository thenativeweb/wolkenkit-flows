'use strict';

const async = require('async'),
      shell = require('shelljs');

const env = require('../helpers/env'),
      waitForPostgres = require('../helpers/waitForPostgres');

async.series({
  runPostgres (callback) {
    shell.exec('docker run -d -p 5435:5432 -e POSTGRES_USER=wolkenkit -e POSTGRES_PASSWORD=wolkenkit -e POSTGRES_DB=wolkenkit --name postgres-performance postgres:9.6.4-alpine', callback);
  },
  waitForPostgres (callback) {
    waitForPostgres({ url: env.POSTGRES_URL_PERFORMANCE }, callback);
  }
}, err => {
  if (err) {
    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
});
