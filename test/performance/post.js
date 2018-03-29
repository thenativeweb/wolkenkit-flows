'use strict';

const shell = require('shelljs');

(async () => {
  try {
    shell.exec('docker kill postgres-performance; docker rm -v postgres-performance');
  } catch (ex) {
    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
})();
