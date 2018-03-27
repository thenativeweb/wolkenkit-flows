'use strict';

const when = {
  'integrationTests.stateless.sendCommand' (event, { app }) {
    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    });
  },

  'integrationTests.stateless.sendCommandAsUser' (event, { app }) {
    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    }, {
      asUser: event.data.asUser
    });
  }
};

module.exports = { when };
