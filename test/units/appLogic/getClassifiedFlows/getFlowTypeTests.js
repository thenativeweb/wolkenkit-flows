'use strict';

const assert = require('assertthat');

const getFlowType = require('../../../../appLogic/getClassifiedFlows/getFlowType');

suite('getFlowType', () => {
  test('is a function.', done => {
    assert.that(getFlowType).is.ofType('function');
    done();
  });

  test('throws an error if flow is missing.', done => {
    assert.that(() => {
      getFlowType();
    }).is.throwing('Flow is missing.');
    done();
  });

  test('classifies stateless flows.', done => {
    assert.that(getFlowType({
      when: {}
    })).is.equalTo('stateless');
    done();
  });

  test('classifies stateful flows.', done => {
    assert.that(getFlowType({
      identity: () => {
        // Intentionally left blank.
      },
      initialState: {},
      transitions: {},
      when: {}
    })).is.equalTo('stateful');
    done();
  });

  test('throws an error if an unknown flow is given.', done => {
    assert.that(() => {
      getFlowType({
        transitions: {},
        when: {}
      });
    }).is.throwing('Unknown flow type.');
    done();
  });
});
