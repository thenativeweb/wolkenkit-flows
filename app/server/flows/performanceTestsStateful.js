'use strict';

const identity = {
  'performanceTests.stateful.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'performanceTests.stateful.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const reactions = {
  pristine: {
    completed () {
      // Intentionally left blank.
    }
  }
};

module.exports = { identity, initialState, transitions, reactions };
