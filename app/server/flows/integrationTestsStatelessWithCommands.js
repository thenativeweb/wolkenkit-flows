'use strict';

const when = {
  'integrationTests.stateless.sendCommand' (event, services, mark) {
    const app = services.get('app');

    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    });

    mark.asDone();
  },

  'integrationTests.stateless.sendCommandAsUser' (event, services, mark) {
    const app = services.get('app');

    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    }, {
      asUser: event.data.asUser
    });

    mark.asDone();
  }
};

module.exports = { when };
