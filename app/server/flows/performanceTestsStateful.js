'use strict';

const identity = {
  'performanceTests.stateful.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {};

const reactions = {};

module.exports = { identity, initialState, transitions, reactions };
