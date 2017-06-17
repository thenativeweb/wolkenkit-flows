'use strict';

const identity = {
  'unitTests.statefulTransitions.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulTransitions.first' (flow) {
      flow.setState({ port: 3000 });
      flow.transitionTo('completed');
    }
  }
};

const when = {};

module.exports = { identity, initialState, transitions, when };
