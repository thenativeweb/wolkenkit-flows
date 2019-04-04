'use strict';

const reactions = {
  'integrationTests.stateless.sendCommand' (event, { app }) {
    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    });
  },

  'integrationTests.stateless.sendCommandAsInitiator' (event, { app }) {
    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    }, {
      asInitiator: event.data.asInitiator
    });
  }
};

module.exports = { reactions };
