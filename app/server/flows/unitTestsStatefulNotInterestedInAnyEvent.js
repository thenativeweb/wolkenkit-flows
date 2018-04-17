'use strict';

const identity = {
  'unitTests.statefulNotInterestedInAnyEvent.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  waiting: {
    'unitTests.statefulNotInterestedInAnyEvent.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const reactions = {};

module.exports = { identity, initialState, transitions, reactions };
