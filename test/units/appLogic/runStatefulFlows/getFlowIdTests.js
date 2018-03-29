'use strict';

const assert = require('assertthat'),
      uuid = require('uuidv4');

const getFlowId = require('../../../../appLogic/runStatefulFlows/getFlowId');

suite('getFlowId', () => {
  test('is a function.', async () => {
    assert.that(getFlowId).is.ofType('function');
  });

  test('throws an error if domain event is missing.', async () => {
    assert.that(() => {
      getFlowId({});
    }).is.throwing('Domain event is missing.');
  });

  test('throws an error if flow is missing.', async () => {
    assert.that(() => {
      getFlowId({ domainEvent: {}});
    }).is.throwing('Flow is missing.');
  });

  test('returns the flow id.', async () => {
    const aggregateId = uuid();

    const domainEvent = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId },
      name: 'started'
    };

    const flow = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-flow'
    };

    const flowId = getFlowId({ flow, domainEvent });

    assert.that(flowId).is.equalTo(uuid.fromString(`some-flow-${aggregateId}`));
  });

  test('derives the flow id from the flow name.', async () => {
    const aggregateId = uuid();

    const domainEvent = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId },
      name: 'started'
    };

    const flow = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-flow'
    };

    const flowId1 = getFlowId({ flow, domainEvent }),
          flowId2 = getFlowId({ flow, domainEvent });

    assert.that(flowId1).is.equalTo(flowId2);
  });

  test('derives different flow ids from different flow names, even if the event is the same.', async () => {
    const aggregateId = uuid();

    const domainEvent1 = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId },
      name: 'started'
    };

    const flow1 = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-flow'
    };

    const domainEvent2 = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId },
      name: 'started'
    };

    const flow2 = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-other-flow'
    };

    const flowId1 = getFlowId({ flow: flow1, domainEvent: domainEvent1 }),
          flowId2 = getFlowId({ flow: flow2, domainEvent: domainEvent2 });

    assert.that(flowId1).is.not.equalTo(flowId2);
  });

  test('derives different flow ids for different aggregate ids, even if the flow name and the events are the same.', async () => {
    const aggregateId1 = uuid(),
          aggregateId2 = uuid();

    const domainEvent1 = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId1 },
      name: 'started'
    };

    const flow1 = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-flow'
    };

    const domainEvent2 = {
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: aggregateId2 },
      name: 'started'
    };

    const flow2 = {
      identity: { 'planning.peerGroup.started': event => event.aggregate.id },
      name: 'some-flow'
    };

    const flowId1 = getFlowId({ flow: flow1, domainEvent: domainEvent1 }),
          flowId2 = getFlowId({ flow: flow2, domainEvent: domainEvent2 });

    assert.that(flowId1).is.not.equalTo(flowId2);
  });
});
