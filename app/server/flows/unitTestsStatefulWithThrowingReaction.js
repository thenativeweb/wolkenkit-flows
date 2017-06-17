'use strict';

const identity = {
  'unitTests.statefulWithThrowingReaction.first': event => event.topic.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulWithThrowingReaction.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
    completed () {
      throw new Error('Something went wrong.');
    }
  }
};

module.exports = { identity, initialState, transitions, when };
