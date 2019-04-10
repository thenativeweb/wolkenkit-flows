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
        eventHandler = new EventHandler({ app, writeModel });

  [
    { connection: app.commandbus.outgoing, description: 'command bus' },
    { connection: app.flowbus.incoming, description: 'flow bus' },
    { connection: eventStore, description: 'event store' }
  ].forEach(wire => {
    wire.connection.on('error', err => {
      app.fail(err);
    });
    wire.connection.on('disconnect', err => {
      logger.error(err.message, { err });
      app.fail(new Error(`Lost connection to ${wire.description}.`));
    });
  });

  app.flowbus.incoming.on('data', async ({ event, metadata, actions }) => {
    logger.info('Received event.', { event, metadata });

    const eventName = `${event.context.name}.${event.aggregate.name}.${event.name}`,
          unpublishedCommands = [];

    const statefulFlows = classifiedFlows.stateful[eventName] || [],
          statelessFlows = classifiedFlows.stateless[eventName] || [];

    try {
      await Promise.all([
        runStatefulFlows({ eventHandler, flows: statefulFlows, domainEvent: event, unpublishedCommands }),
        runStatelessFlows({ eventHandler, flows: statelessFlows, domainEvent: event, unpublishedCommands })
      ]);
    } catch (ex) {
      logger.error('Failed to handle event.', { event, metadata, ex });
      actions.discard();

      return;
    }

    for (const unpublishedCommand of unpublishedCommands) {
      app.commandbus.outgoing.write({
        command: unpublishedCommand.command,
        metadata: unpublishedCommand.metadata
      });
    }

    logger.info('Successfully handled event.', { event, metadata });
    actions.next();
  });
};

module.exports = appLogic;
