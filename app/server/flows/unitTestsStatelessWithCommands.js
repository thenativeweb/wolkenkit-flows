'use strict';

const when = {
  'unitTests.stateless.sendCommand' (event, services, mark) {
    const app = services.get('app');

    app.planning.peerGroup().start({
      initiator: event.data.initiator,
      destination: event.data.destination
    });

    mark.asDone();
  }
};

module.exports = { when };
