'use strict';

const handleEvent = async function ({ eventHandler, flow, domainEvent, services }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!services) {
    throw new Error('Services are missing.');
  }

  await eventHandler.forStatelessFlow({ flow, domainEvent, services });
};

module.exports = handleEvent;
