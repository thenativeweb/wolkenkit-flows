'use strict';

const identity = {
  'unitTests.stateful.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.stateful.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
    completed (flow, event, mark) {
      mark.asDone();
    }
  }
};

module.exports = { identity, initialState, transitions, when };
