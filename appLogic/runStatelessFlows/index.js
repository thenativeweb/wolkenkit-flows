'use strict';

const async = require('async'),
      requireDir = require('require-dir');

const workflow = requireDir();

const runStatelessFlows = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.eventHandler) {
    throw new Error('Event handler is missing.');
  }
  if (!options.flows) {
    throw new Error('Flows are missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.services) {
    throw new Error('Services are missing.');
  }
  if (!callback) {
    throw new Error('Callback is missing.');
  }

  const { eventHandler, flows, domainEvent, services } = options;

  async.each(flows, (flow, done) => {
    async.waterfall([
      workflow.handleEvent({ eventHandler, flow, domainEvent, services })
    ], done);
  }, callback);
};

module.exports = runStatelessFlows;
