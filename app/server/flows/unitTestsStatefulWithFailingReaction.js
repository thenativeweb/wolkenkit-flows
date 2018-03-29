'use strict';

const identity = {
  'unitTests.statefulWithFailingReaction.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulWithFailingReaction.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
    completed (flow, event) {
      event.fail('Something went wrong.');
    }
  }
};

module.exports = { identity, initialState, transitions, when };
