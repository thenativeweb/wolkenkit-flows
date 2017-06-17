'use strict';

const needle = require('needle');

const identity = {
  'integrationTests.statefulPerformTransition.callExternalService': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulPerformTransition.callExternalService' (flow, event) {
      flow.setState({
        port: event.data.port
      });
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
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
