'use strict';

const map = require('lodash/map'),
      requireDir = require('require-dir');

const repository = require('../../repository');

const workflow = requireDir(__dirname);

const runStatefulFlows = async function ({ eventHandler, flows, domainEvent, unpublishedCommands }) {
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
    const flowId = workflow.getFlowId({ domainEvent, flow });
    const flowAggregate = await workflow.loadFlowAggregate({ flow, flowId, repository, domainEvent });

    await workflow.handleEvent({ flow, flowAggregate, domainEvent, eventHandler, unpublishedCommands });
    await workflow.saveFlowAggregate({ flowAggregate, repository });
  }));
};

module.exports = runStatefulFlows;
