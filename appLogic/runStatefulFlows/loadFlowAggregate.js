'use strict';

const loadFlowAggregate = async function ({ flow, flowId, repository, domainEvent }) {
  if (!flow) {
    throw new Error('Flow is missing.');
  }
  if (!flowId) {
    throw new Error('Flow id is missing.');
  }
  if (!repository) {
    throw new Error('Repository is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }

  const aggregate = await repository.loadAggregateForDomainEvent({
    aggregate: { name: flow.name, id: flowId },
    domainEvent
  });

  return aggregate;
};

module.exports = loadFlowAggregate;
