'use strict';

const identity = {
  'performanceTests.stateful.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {};

const when = {};

module.exports = { identity, initialState, transitions, when };
