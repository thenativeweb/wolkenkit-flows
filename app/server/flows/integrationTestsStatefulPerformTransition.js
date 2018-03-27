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
    async completed (flow, event) {
      const { port } = flow.state;

      let res;

      try {
        res = await needle.get(`http://localhost:${port}/notify`);
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
