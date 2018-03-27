'use strict';

const getApp = require('./getApp'),
      getLogger = require('./getLogger');

const get = function ({ app, flow, repository, writeModel }) {
  if (!app) {
    throw new Error('App is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!repository) {
    throw new Error('Repository is missing.');
  }
  if (!writeModel) {
    throw new Error('Write model is missing.');
  }

  const services = {
    app: getApp({ repository, writeModel }),
    logger: getLogger({ app, flow })
  };

  return services;
};

module.exports = get;
