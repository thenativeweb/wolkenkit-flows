'use strict';

const async = require('async'),
      requireDir = require('require-dir');

const repository = require('../../repository');

const workflow = requireDir();

const runStatefulFlows = function (options, callback) {
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
      workflow.getFlowId({ domainEvent, flow }),
      workflow.loadFlowAggregate({ domainEvent, flow, repository }),
      workflow.handleEvent({ domainEvent, eventHandler, services }),
      workflow.saveFlowAggregate({ repository })
    ], done);
  }, callback);
};

module.exports = runStatefulFlows;
