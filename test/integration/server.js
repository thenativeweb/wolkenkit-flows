'use strict';

const http = require('http');

const processenv = require('processenv');

const port = processenv('PORT') || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end();

  if (req.url !== '/notify') {
    return;
  }

  setTimeout(() => {
    /* eslint-disable no-process-exit */
    process.exit();
    /* eslint-enable no-process-exit */
  }, 0.1 * 1000);
});

server.listen(port);
