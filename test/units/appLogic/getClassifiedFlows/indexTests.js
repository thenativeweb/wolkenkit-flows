'use strict';

const assert = require('assertthat');

const getClassifiedFlows = require('../../../../appLogic/getClassifiedFlows');

suite('getClassifiedFlows', () => {
  test('is a function.', async () => {
    assert.that(getClassifiedFlows).is.ofType('function');
  });

  test('throws an error if flows are missing.', async () => {
    assert.that(() => {
      getClassifiedFlows();
    }).is.throwing('Flows are missing.');
  });

  test('classifies flows.', async () => {
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
  });

  test('ignores missing stateful flows.', async () => {
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
  });

  test('ignores missing stateless flows.', async () => {
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
  });

  test('throws an error if an unknown flow type is given.', async () => {
    const flowUnknown = {
      whatever: {}
    };

    assert.that(() => {
      getClassifiedFlows({ flowUnknown });
    }).is.throwing('Unknown flow type.');
  });
});
