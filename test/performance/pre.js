'use strict';

const shell = require('shelljs');

const env = require('../helpers/env'),
      waitForPostgres = require('../helpers/waitForPostgres');

(async () => {
  try {
    shell.exec('docker run -d -p 5435:5432 -e POSTGRES_USER=wolkenkit -e POSTGRES_PASSWORD=wolkenkit -e POSTGRES_DB=wolkenkit --name postgres-performance postgres:9.6.4-alpine');
    await waitForPostgres({ url: env.POSTGRES_URL_PERFORMANCE });
  } catch (ex) {
    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
})();
