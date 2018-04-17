'use strict';

const identity = {
  'integrationTests.statefulWithCommand.sendCommand': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulWithCommand.sendCommand' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const reactions = {
  pristine: {
    completed (flow, event, { app }) {
      app.planning.peerGroup().start({
        initiator: event.data.initiator,
        destination: event.data.destination
      });
    }
  }
};

module.exports = { identity, initialState, transitions, reactions };
