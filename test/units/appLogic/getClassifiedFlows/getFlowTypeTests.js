'use strict';

const assert = require('assertthat');

const getFlowType = require('../../../../appLogic/getClassifiedFlows/getFlowType');

suite('getFlowType', () => {
  test('is a function.', async () => {
    assert.that(getFlowType).is.ofType('function');
  });

  test('throws an error if flow is missing.', async () => {
    assert.that(() => {
      getFlowType();
    }).is.throwing('Flow is missing.');
  });

  test('classifies stateless flows.', async () => {
    assert.that(getFlowType({
      reactions: {}
    })).is.equalTo('stateless');
  });

  test('classifies stateful flows.', async () => {
    assert.that(getFlowType({
      identity: () => {
        // Intentionally left blank.
      },
      initialState: {},
      transitions: {},
      reactions: {}
    })).is.equalTo('stateful');
  });

  test('throws an error if an unknown flow is given.', async () => {
    assert.that(() => {
      getFlowType({
        transitions: {},
        reactions: {}
      });
    }).is.throwing('Unknown flow type.');
  });
});
