'use strict';

const handleEvent = async function ({ flowAggregate, domainEvent, eventHandler, services }) {
  if (!flowAggregate) {
    throw new Error('Flow aggregate is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!services) {
    throw new Error('Services are missing.');
  }

  await eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services });
};

module.exports = handleEvent;
