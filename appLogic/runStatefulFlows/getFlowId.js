'use strict';

const uuid = require('uuidv4');

const getFlowId = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.flow) {
    throw new Error('Flow is missing.');
  }

  const { domainEvent, flow } = options;

  return function (done) {
    if (!done) {
      throw new Error('Callback is missing.');
    }

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
          flowId = uuid.fromString(`${flow.name}-${flow.identity[eventName](domainEvent)}`);

    done(null, flowId);
  };
};

module.exports = getFlowId;
