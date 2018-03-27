'use strict';

const assert = require('assertthat'),
      uuid = require('uuidv4');

const loadFlowAggregate = require('../../../../appLogic/runStatefulFlows/loadFlowAggregate');

suite('loadFlowAggregate', () => {
  test('is a function.', async () => {
    assert.that(loadFlowAggregate).is.ofType('function');
  });

  test('throws an error if flow is missing.', async () => {
    await assert.that(async () => {
      await loadFlowAggregate({});
    }).is.throwingAsync('Flow is missing.');
  });

  test('throws an error if flow id is missing.', async () => {
    await assert.that(async () => {
      await loadFlowAggregate({ flow: {}});
    }).is.throwingAsync('Flow id is missing.');
  });

  test('throws an error if repository is missing.', async () => {
    await assert.that(async () => {
      await loadFlowAggregate({ flow: {}, flowId: uuid() });
    }).is.throwingAsync('Repository is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    await assert.that(async () => {
      await loadFlowAggregate({ flow: {}, flowId: uuid(), repository: {}});
    }).is.throwingAsync('Domain event is missing.');
  });

  test('loads the flow aggregate from the repository.', async () => {
    const domainEvent = {},
          flow = { name: 'some-flow' },
          flowAggregate = {},
          flowId = uuid();

    const repository = {
      async loadAggregateForDomainEvent (options) {
        assert.that(options).is.ofType('object');
        assert.that(options.aggregate).is.ofType('object');
        assert.that(options.aggregate.name).is.equalTo(flow.name);
        assert.that(options.aggregate.id).is.equalTo(flowId);
        assert.that(options.domainEvent).is.sameAs(domainEvent);

        return flowAggregate;
      }
    };

    const returnedFlowAggregate = await loadFlowAggregate({ flow, flowId, domainEvent, repository });

    assert.that(returnedFlowAggregate).is.sameAs(flowAggregate);
  });

  test('throws an error when the event handler throws an error.', async () => {
    const domainEvent = {},
          flow = { name: 'some-flow' },
          flowId = uuid();

    const repository = {
      async loadAggregateForDomainEvent () {
        throw new Error('Something went wrong.');
      }
    };

    await assert.that(async () => {
      await loadFlowAggregate({ flow, flowId, domainEvent, repository });
    }).is.throwingAsync('Something went wrong.');
  });
});
