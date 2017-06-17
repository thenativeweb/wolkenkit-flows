'use strict';

const handleEvent = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!options.services) {
    throw new Error('Services are missing.');
  }

  const { domainEvent, eventHandler, services } = options;

  return function (flowAggregate, done) {
    if (!flowAggregate) {
      throw new Error('Flow aggregate is missing.');
    }
    if (!done) {
      throw new Error('Callback is missing.');
    }

    eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
      if (err) {
        return done(err);
      }
      done(null, flowAggregate);
    });
  };
};

module.exports = handleEvent;
