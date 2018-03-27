'use strict';

const getApp = require('./getApp'),
      getLogger = require('./getLogger');

const get = function ({ app, domainEvent, flow, unpublishedCommands, writeModel }) {
  if (!app) {
    throw new Error('App is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }
  if (!writeModel) {
    throw new Error('Write model is missing.');
  }

  const services = {
    app: getApp({ app, domainEvent, unpublishedCommands, writeModel }),
    logger: getLogger({ app, flow })
  };

  return services;
};

module.exports = get;
