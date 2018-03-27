'use strict';

const { Command } = require('commands-events'),
      uuid = require('uuidv4');

const FlowAggregate = require('../../EventHandler/FlowAggregate');

const buildFlow = function (options) {
  options = options || {};

  const commandCount = options.commandCount || 1;

  const flow = new FlowAggregate();

  for (let i = 0; i < commandCount; i++) {
    const command = new Command({
      context: { name: 'planning' },
      aggregate: { name: 'peerGroup', id: uuid() },
      name: 'start',
      data: { initiator: 'Jane Doe', destination: 'Riva' }
    });

    flow.uncommittedCommands.push(command);
  }

  return flow;
};

module.exports = buildFlow;
