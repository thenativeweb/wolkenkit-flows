'use strict';

const requireDir = require('require-dir');

const workflow = requireDir(__dirname);

const runStatelessFlows = async function ({ eventHandler, flows, domainEvent, services }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flows) {
    throw new Error('Flows are missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!services) {
    throw new Error('Services are missing.');
  }

  await Promise.all(flows.map(async flow => {
    await workflow.handleEvent({ eventHandler, flow, domainEvent, services });
  }));
};

module.exports = runStatelessFlows;
