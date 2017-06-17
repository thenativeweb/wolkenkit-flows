'use strict';

const handleEvent = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!options.flow) {
    throw new Error('Flow is missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.services) {
    throw new Error('Services are missing.');
  }

  const { eventHandler, flow, domainEvent, services } = options;

  return function (done) {
    if (!done) {
      throw new Error('Callback is missing.');
    }

    eventHandler.forStatelessFlow({ flow, domainEvent, services }, done);
  };
};

module.exports = handleEvent;
