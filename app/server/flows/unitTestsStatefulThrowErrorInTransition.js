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

const reactions = {};

module.exports = { identity, initialState, transitions, reactions };
