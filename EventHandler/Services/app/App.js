'use strict';

const uuid = require('uuidv4');

const App = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.app) {
    throw new Error('App is missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }
  if (!options.writeModel) {
    throw new Error('Write model is missing.');
  }

  const { app, domainEvent, unpublishedCommands, writeModel } = options;

  Object.keys(writeModel).forEach(contextName => {
    this[contextName] = {};

    Object.keys(writeModel[contextName]).forEach(aggregateName => {
      this[contextName][aggregateName] = function (aggregateId) {
        const commands = {};

        Object.keys(writeModel[contextName][aggregateName].commands).forEach(commandName => {
          commands[commandName] = function (data, commandOptions) {
            commandOptions = commandOptions || {};

            const command = new app.Command({
              context: {
                name: contextName
              },
              aggregate: {
                name: aggregateName,
                id: aggregateId || uuid()
              },
              name: commandName,
              data
            });

            command.metadata.causationId = domainEvent.id;
            command.metadata.correlationId = domainEvent.metadata.correlationId;
            command.addToken({ sub: commandOptions.asUser || domainEvent.user.id });

            unpublishedCommands.push(command);
          };
        });

        return commands;
      };
    });
  });
};

module.exports = App;
