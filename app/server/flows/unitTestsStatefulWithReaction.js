'use strict';

const identity = {
  'unitTests.statefulWithReaction.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulWithReaction.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
    completed (flow, event, { logger }) {
      logger.info('Should be recorded by the tests.');
    }
  }
};

module.exports = { identity, initialState, transitions, when };
