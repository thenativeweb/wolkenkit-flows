'use strict';

const async = require('async'),
      shell = require('shelljs');

const env = require('../helpers/env'),
      waitForHost = require('../helpers/waitForHost');

const pre = function (done) {
  async.series({
    runPostgres (callback) {
      shell.exec('docker run -d -p 5433:5432 -e POSTGRES_USER=wolkenkit -e POSTGRES_PASSWORD=wolkenkit -e POSTGRES_DB=wolkenkit --name postgres-units postgres:9.6.2-alpine', callback);
    },
    waitForPostgres (callback) {
      waitForHost(env.POSTGRES_URL_UNITS, callback);
    }
  }, done);
};

module.exports = pre;
