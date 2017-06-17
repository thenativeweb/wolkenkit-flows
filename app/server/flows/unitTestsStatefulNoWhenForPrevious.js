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

const when = {
  waiting: {
    completed (flow, event, services, mark) {
      const logger = services.get('logger');

      logger.info('Should not be recorded by the tests.');

      mark.asDone();
    }
  }
};

module.exports = { identity, initialState, transitions, when };
