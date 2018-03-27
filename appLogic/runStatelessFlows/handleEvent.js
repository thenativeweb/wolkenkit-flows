'use strict';

const handleEvent = async function ({ eventHandler, flow, domainEvent }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }

  await eventHandler.forStatelessFlow({ flow, domainEvent });
};

module.exports = handleEvent;
