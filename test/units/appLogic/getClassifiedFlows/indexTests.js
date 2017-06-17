'use strict';

const assert = require('assertthat');

const getClassifiedFlows = require('../../../../appLogic/getClassifiedFlows');

suite('getClassifiedFlows', () => {
  test('is a function.', done => {
    assert.that(getClassifiedFlows).is.ofType('function');
    done();
  });

  test('throws an error if flows are missing.', done => {
    assert.that(() => {
      getClassifiedFlows();
    }).is.throwing('Flows are missing.');
    done();
  });

  test('classifies flows.', done => {
    const flowStateful = {
      identity: {},
      initialState: {},
      transitions: {
        pristine: {
          'planning.peerGroup.started' () {}
        }
      },
      when: {
        pristine: {
          completed () {}
        }
      }
    };

    const flowStateless = {
      when: {
        'planning.peerGroup.joined' () {}
      }
    };

    const classifiedFlows = getClassifiedFlows({ flowStateful, flowStateless });

    assert.that(classifiedFlows).is.equalTo({
      stateful: {
        'planning.peerGroup.started': [ flowStateful ]
      },
      stateless: {
        'planning.peerGroup.joined': [ flowStateless ]
      }
    });

    done();
  });

  test('ignores missing stateful flows.', done => {
    const flowStateless = {
      when: {
        'planning.peerGroup.joined' () {}
      }
    };

    const classifiedFlows = getClassifiedFlows({ flowStateless });

    assert.that(classifiedFlows).is.equalTo({
      stateful: {},
      stateless: {
        'planning.peerGroup.joined': [ flowStateless ]
      }
    });

    done();
  });

  test('ignores missing stateless flows.', done => {
    const flowStateful = {
      identity: {},
      initialState: {},
      transitions: {
        pristine: {
          'planning.peerGroup.started' () {}
        }
      },
      when: {
        pristine: {
          completed () {}
        }
      }
    };

    const classifiedFlows = getClassifiedFlows({ flowStateful });

    assert.that(classifiedFlows).is.equalTo({
      stateful: {
        'planning.peerGroup.started': [ flowStateful ]
      },
      stateless: {}
    });

    done();
  });

  test('throws an error if an unknown flow type is given.', done => {
    const flowUnknown = {
      whatever: {}
    };

    assert.that(() => {
      getClassifiedFlows({ flowUnknown });
    }).is.throwing('Unknown flow type.');

    done();
  });
});
