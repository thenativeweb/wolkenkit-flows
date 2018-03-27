'use strict';

const EventHandler = require('../EventHandler'),
      getClassifiedFlows = require('./getClassifiedFlows'),
      runStatefulFlows = require('./runStatefulFlows'),
      runStatelessFlows = require('./runStatelessFlows');

const appLogic = function ({ app, eventStore, flows, writeModel }) {
  if (!app) {
    throw new Error('App is missing.');
  }
  if (!eventStore) {
    throw new Error('Event store is missing.');
  }
  if (!flows) {
    throw new Error('Flows are missing.');
  }
  if (!writeModel) {
    throw new Error('Write model is missing.');
  }

  const logger = app.services.getLogger();

  const classifiedFlows = getClassifiedFlows(flows),
        eventHandler = new EventHandler({ app });

  [
    { connection: app.commandbus.outgoing, description: 'command bus' },
    { connection: app.flowbus.incoming, description: 'flow bus' },
    { connection: eventStore, description: 'event store' }
  ].forEach(wire => {
    wire.connection.on('error', err => {
      app.fail(err);
    });
    wire.connection.on('disconnect', () => {
      app.fail(new Error(`Lost connection to ${wire.description}.`));
    });
  });

  app.flowbus.incoming.on('data', async domainEvent => {
    logger.info('Received event.', { domainEvent });

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
          unpublishedCommands = [];

    const statefulFlows = classifiedFlows.stateful[eventName] || [],
          statelessFlows = classifiedFlows.stateless[eventName] || [];

    try {
      await Promise.all([
        runStatefulFlows({ eventHandler, flows: statefulFlows, domainEvent, unpublishedCommands }),
        runStatelessFlows({ eventHandler, flows: statelessFlows, domainEvent, unpublishedCommands })
      ]);
    } catch (ex) {
      logger.error('Failed to handle event.', { domainEvent, ex });
      domainEvent.discard();

      return;
    }

    unpublishedCommands.forEach(command => {
      app.commandbus.outgoing.write(command);
    });

    logger.info('Successfully handled event.', { domainEvent });
    domainEvent.next();
  });
};

module.exports = appLogic;
