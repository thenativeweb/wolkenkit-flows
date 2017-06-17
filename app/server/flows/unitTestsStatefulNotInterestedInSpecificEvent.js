'use strict';

const identity = {
  'unitTests.statefulNotInterestedInSpecificEvent.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulNotInterestedInSpecificEvent.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {};

module.exports = { identity, initialState, transitions, when };
