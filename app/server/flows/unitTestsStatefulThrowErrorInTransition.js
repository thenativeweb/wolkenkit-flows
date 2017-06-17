'use strict';

const identity = {
  'unitTests.statefulThrowErrorInTransition.first': event => event.topic.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulThrowErrorInTransition.first' () {
      throw new Error('Something went wrong.');
    }
  }
};

const when = {};

module.exports = { identity, initialState, transitions, when };
