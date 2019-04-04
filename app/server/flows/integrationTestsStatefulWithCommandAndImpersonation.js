'use strict';

const identity = {
  'integrationTests.statefulWithCommandAndImpersonation.sendCommandAsInitiator': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulWithCommandAndImpersonation.sendCommandAsInitiator' (flow) {
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
      }, {
        asInitiator: event.data.asInitiator
      });
    }
  }
};

module.exports = { identity, initialState, transitions, reactions };
