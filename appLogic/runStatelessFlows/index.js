'use strict';

const map = require('lodash/map'),
      requireDir = require('require-dir');

const workflow = requireDir(__dirname);

const runStatelessFlows = async function ({ eventHandler, flows, domainEvent }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flows) {
    throw new Error('Flows are missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }

  await Promise.all(map(flows, async (flow, flowName) => {
    flow.name = flowName;

    await workflow.handleEvent({ eventHandler, flow, domainEvent });
  }));
};

module.exports = runStatelessFlows;
