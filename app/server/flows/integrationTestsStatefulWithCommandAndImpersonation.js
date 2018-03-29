'use strict';

const identity = {
  'integrationTests.statefulWithCommandAndImpersonation.sendCommandAsUser': event => event.aggregate.id
};

const initialState = {
  is: 'pristine'
};

const transitions = {
  pristine: {
    'integrationTests.statefulWithCommandAndImpersonation.sendCommandAsUser' (flow) {
      flow.transitionTo('completed');
    }
  }
};

const when = {
  pristine: {
    completed (flow, event, { app }) {
      app.planning.peerGroup().start({
        initiator: event.data.initiator,
        destination: event.data.destination
      }, {
        asUser: event.data.asUser
      });
    }
  }
};

module.exports = { identity, initialState, transitions, when };
