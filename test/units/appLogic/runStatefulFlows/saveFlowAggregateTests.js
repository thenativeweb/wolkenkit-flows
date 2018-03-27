'use strict';

const assert = require('assertthat');

const saveFlowAggregate = require('../../../../appLogic/runStatefulFlows/saveFlowAggregate');

suite('saveFlowAggregate', () => {
  test('is a function.', async () => {
    assert.that(saveFlowAggregate).is.ofType('function');
  });

  test('throws an error if flow aggregate is missing.', async () => {
    await assert.that(async () => {
      await saveFlowAggregate({});
    }).is.throwingAsync('Flow aggregate is missing.');
  });

  test('throws an error if repository is missing.', async () => {
    await assert.that(async () => {
      await saveFlowAggregate({ flowAggregate: {}});
    }).is.throwingAsync('Repository is missing.');
  });

  test('saves the flow aggregate to the repository.', async () => {
    const flowAggregate = {};

    const repository = {
      async saveAggregate (flowAggregateToSave) {
        assert.that(flowAggregateToSave).is.sameAs(flowAggregate);
      }
    };

    await saveFlowAggregate({ flowAggregate, repository });
  });

  test('throws an error when the repository throws an error.', async () => {
    const flowAggregate = {};

    const repository = {
      async saveAggregate () {
        throw new Error('Something went wrong.');
      }
    };

    await assert.that(async () => {
      await saveFlowAggregate({ flowAggregate, repository });
    }).is.throwingAsync('Something went wrong.');
  });
});
