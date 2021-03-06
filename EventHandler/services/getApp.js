'use strict';

const uuid = require('uuidv4');

const getApp = function ({ app, domainEvent, unpublishedCommands, writeModel }) {
  if (!app) {
    throw new Error('App is missing.');
  }
  if (!domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }
  if (!writeModel) {
    throw new Error('Write model is missing.');
  }

  const api = {};

  Object.keys(writeModel).forEach(contextName => {
    api[contextName] = {};

    Object.keys(writeModel[contextName]).forEach(aggregateName => {
      api[contextName][aggregateName] = function (aggregateId) {
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

  return api;
};

module.exports = getApp;
