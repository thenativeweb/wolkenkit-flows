'use strict';

const http = require('http'),
      { promisify } = require('util');

const processenv = require('processenv');

const sleep = promisify(setTimeout);

const port = processenv('PORT') || 3000;

const server = http.createServer(async (req, res) => {
  res.writeHead(200);
  res.end();

  if (req.url !== '/notify') {
    return;
  }

  await sleep(0.1 * 1000);

  /* eslint-disable no-process-exit */
  process.exit();
  /* eslint-enable no-process-exit */
});

server.listen(port);
