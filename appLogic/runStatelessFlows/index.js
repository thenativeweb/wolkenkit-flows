'use strict';

const map = require('lodash/map'),
      requireDir = require('require-dir');

const workflow = requireDir(__dirname);

const runStatelessFlows = async function ({ eventHandler, flows, domainEvent, unpublishedCommands }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flows) {
    throw new Error('Flows are missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }

  await Promise.all(map(flows, async flow => {
    await workflow.handleEvent({ eventHandler, flow, domainEvent, unpublishedCommands });
  }));
};

module.exports = runStatelessFlows;
