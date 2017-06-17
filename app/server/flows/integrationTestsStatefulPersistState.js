'use strict';

const needle = require('needle');

const identity = {
  'integrationTests.statefulPersistState.setPort': event => event.aggregate.id,
  'integrationTests.statefulPersistState.callExternalService': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulPersistState.setPort' (flow, event) {
      flow.setState({
        port: event.data.port
      });
      flow.transitionTo('setPort');
    }
  },

  setPort: {
    'integrationTests.statefulPersistState.callExternalService' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  setPort: {
    completed (flow, event, mark) {
      const { port } = flow.state;

      needle.get(`http://localhost:${port}/notify`, (err, res) => {
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
