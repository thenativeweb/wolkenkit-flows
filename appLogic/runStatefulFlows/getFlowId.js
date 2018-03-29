'use strict';

const uuid = require('uuidv4');

const getFlowId = function ({ domainEvent, flow }) {
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }

  const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
        flowId = uuid.fromString(`${flow.name}-${flow.identity[eventName](domainEvent)}`);

  return flowId;
};

module.exports = getFlowId;
