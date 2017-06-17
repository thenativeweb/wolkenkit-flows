'use strict';

const loadFlowAggregate = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.flow) {
    throw new Error('Flow is missing.');
  }
  if (!options.repository) {
    throw new Error('Repository is missing.');
  }

  const { domainEvent, flow, repository } = options;

  return function (flowId, done) {
    if (!flowId) {
      throw new Error('Flow id is missing.');
    }
    if (!done) {
      throw new Error('Callback is missing.');
    }

    repository.loadAggregateForDomainEvent({
      aggregate: { name: flow.name, id: flowId },
      domainEvent
    }, done);
  };
};

module.exports = loadFlowAggregate;
