'use strict';

const identity = {
  'unitTests.statefulNoWhenForPrevious.first': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'unitTests.statefulNoWhenForPrevious.first' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const reactions = {
  waiting: {
    completed (flow, event, { logger }) {
      logger.info('Should not be recorded by the tests.');
    }
  }
};

module.exports = { identity, initialState, transitions, reactions };
