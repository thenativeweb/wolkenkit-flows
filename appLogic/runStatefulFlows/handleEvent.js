'use strict';

const handleEvent = async function ({ flow, flowAggregate, domainEvent, eventHandler, unpublishedCommands }) {
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!flowAggregate) {
    throw new Error('Flow aggregate is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }

  await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });
};

module.exports = handleEvent;
