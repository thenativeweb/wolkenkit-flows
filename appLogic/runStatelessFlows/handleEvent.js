'use strict';

const handleEvent = async function ({ eventHandler, flow, domainEvent, unpublishedCommands }) {
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }

  await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });
};

module.exports = handleEvent;
