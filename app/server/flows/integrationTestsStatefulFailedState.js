'use strict';

const needle = require('needle');

const identity = {
  'integrationTests.statefulFailedState.fail': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulFailedState.fail' () {
      throw new Error('Something went wrong.');
    }
  }
};

const when = {
  pristine: {
    failed (flow, event, mark) {
      needle.get(`http://localhost:3000/notify`, (err, res) => {
        if (err) {
          return mark.asFailed(err.message);
        }
        if (res.statusCode !== 200) {
          return mark.asFailed('Unexpected status code.');
        }
        mark.asDone();
      });
    }
  }
};

module.exports = { identity, initialState, transitions, when };
