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
    async failed (flow, event) {
      let res;

      try {
        res = await needle.get(`http://localhost:3000/notify`);
      } catch (ex) {
        return event.fail(ex.message);
      }

      if (res.statusCode !== 200) {
        return event.fail('Unexpected status code.');
      }
    }
  }
};

module.exports = { identity, initialState, transitions, when };
