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

const when = {
  pristine: {
    completed (flow, event, services, mark) {
      const app = services.get('app');

      app.planning.peerGroup().start({
        initiator: event.data.initiator,
        destination: event.data.destination
      });

      mark.asDone();
    }
  }
};

module.exports = { identity, initialState, transitions, when };
