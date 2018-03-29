'use strict';

const path = require('path');

const basePath = path.join('/', 'wolkenkit', 'app', 'server', 'flows');

const getLogger = function ({ app, flow }) {
  if (!app) {
    throw new Error('App is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }

  const logger = app.services.getLogger(
    path.join(basePath, `${flow.name}.js`)
  );

  return logger;
};

module.exports = getLogger;
