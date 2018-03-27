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
