'use strict';

const FlowAggregate = require('./FlowAggregate');

const Repository = function () {
  // Initialization is done by the initialize function.
};

Repository.prototype.initialize = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.app) {
    throw new Error('App is missing.');
  }
  if (!options.flows) {
    throw new Error('Flows are missing.');
  }
  if (!options.eventStore) {
    throw new Error('Event store is missing.');
  }
  if (!callback) {
    throw new Error('Callback is missing.');
  }

  this.app = options.app;
  this.logger = options.app.services.getLogger();
  this.flows = options.flows;
  this.eventStore = options.eventStore;

  callback(null);
};

Repository.prototype.loadAggregateForDomainEvent = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.aggregate) {
    throw new Error('Aggregate is missing.');
  }
  if (!options.aggregate.name) {
    throw new Error('Aggregate name is missing.');
  }
  if (!options.aggregate.id) {
    throw new Error('Aggregate id is missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!callback) {
    throw new Error('Callback is missing.');
  }

  const flowAggregate = new FlowAggregate({
    app: this.app,
    flows: this.flows,
    aggregate: options.aggregate,
    domainEvent: options.domainEvent
  });

  this.eventStore.getLastEvent(flowAggregate.instance.id, (err, event) => {
    if (err) {
      return callback(err);
    }

    if (event) {
      flowAggregate.api.forTransitions.state = event.data.state;
      flowAggregate.api.forWhen.state = event.data.state;
      flowAggregate.instance.revision = event.metadata.revision;
    }

    callback(null, flowAggregate);
  });
};

Repository.prototype.saveAggregate = function (aggregate, callback) {
  if (!aggregate) {
    throw new Error('Aggregate is missing.');
  }
  if (!callback) {
    throw new Error('Callback is missing.');
  }

  if (aggregate.instance.uncommittedEvents.length === 0) {
    return process.nextTick(() => callback(null));
  }

  this.eventStore.saveEvents({
    events: aggregate.instance.uncommittedEvents
  }, err => {
    if (err) {
      return callback(err);
    }
    callback(null);
  });
};

module.exports = Repository;
