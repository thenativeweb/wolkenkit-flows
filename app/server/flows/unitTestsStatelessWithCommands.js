'use strict';

const reactions = {
  'unitTests.stateless.sendCommand' (event, { app }) {
    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    });
  }
};

module.exports = { reactions };
