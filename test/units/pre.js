'use strict';

const shell = require('shelljs');

const env = require('../helpers/env'),
      waitForPostgres = require('../helpers/waitForPostgres');

const pre = function (done) {
  (async () => {
    try {
      shell.exec('docker run -d -p 5433:5432 -e POSTGRES_USER=wolkenkit -e POSTGRES_PASSWORD=wolkenkit -e POSTGRES_DB=wolkenkit --name postgres-units postgres:9.6.4-alpine');
      await waitForPostgres({ url: env.POSTGRES_URL_UNITS });
    } catch (ex) {
      return done(ex);
    }
    done();
  })();
};

module.exports = pre;
