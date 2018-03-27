'use strict';

const requireDir = require('require-dir');

const repository = require('../../repository');

const workflow = requireDir(__dirname);

const runStatefulFlows = async function ({ eventHandler, flows, domainEvent, services }) {
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
    const flowId = workflow.getFlowId({ domainEvent, flow });
    const flowAggregate = workflow.loadFlowAggregate({ flow, flowId, repository, domainEvent });

    await workflow.handleEvent({ flowAggregate, domainEvent, eventHandler, services });
    await workflow.saveFlowAggregate({ flowAggregate, repository });
  }));
};

module.exports = runStatefulFlows;
