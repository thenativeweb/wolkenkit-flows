'use strict';

const async = require('async');

const EventHandler = require('../EventHandler'),
      getClassifiedFlows = require('./getClassifiedFlows'),
      runStatefulFlows = require('./runStatefulFlows'),
      runStatelessFlows = require('./runStatelessFlows'),
      Services = require('../EventHandler/Services');

const appLogic = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.app) {
    throw new Error('App is missing.');
  }
  if (!options.eventStore) {
    throw new Error('Event store is missing.');
  }
  if (!options.flows) {
    throw new Error('Flows are missing.');
  }
  if (!options.writeModel) {
    throw new Error('Write model is missing.');
  }

  const { app, eventStore, flows, writeModel } = options;

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

  app.flowbus.incoming.on('data', domainEvent => {
    logger.info('Received event.', { domainEvent });

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
          unpublishedCommands = [];

    const services = new Services({
      app,
      domainEvent,
      unpublishedCommands,
      writeModel
    });

    const statefulFlows = classifiedFlows.stateful[eventName] || [],
          statelessFlows = classifiedFlows.stateless[eventName] || [];

    async.parallel([
      done => runStatefulFlows({ eventHandler, flows: statefulFlows, domainEvent, services }, done),
      done => runStatelessFlows({ eventHandler, flows: statelessFlows, domainEvent, services }, done)
    ], err => {
      if (err) {
        logger.error('Failed to handle event.', { domainEvent, err });

        return domainEvent.discard();
      }

      unpublishedCommands.forEach(command => {
        app.commandbus.outgoing.write(command);
      });

      logger.info('Successfully handled event.', { domainEvent });
      domainEvent.next();
    });
  });
};

module.exports = appLogic;
