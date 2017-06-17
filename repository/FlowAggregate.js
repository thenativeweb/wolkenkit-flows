'use strict';

const _ = require('lodash');

const FlowAggregate = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.app) {
    throw new Error('App is missing.');
  }
  if (!options.flows) {
    throw new Error('Flows are missing.');
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

  if (!options.flows[options.aggregate.name]) {
    throw new Error('Flow does not exist.');
  }

  this.definition = options.flows[options.aggregate.name];

  this.instance = {};
  this.instance.id = options.aggregate.id;
  this.instance.revision = 0;
  this.instance.uncommittedEvents = [];
  this.instance.exists = () =>
    this.instance.revision > 0;

  this.instance.events = {};
  this.instance.events.publish = (eventName, data) => {
    if (!eventName) {
      throw new Error('Event name is missing.');
    }
    if (eventName !== 'transitioned') {
      throw new Error('Invalid operation.');
    }

    const flowEvent = new options.app.Event({
      context: { name: 'flows' },
      aggregate: { name: options.aggregate.name, id: this.instance.id },
      name: eventName,
      data,
      metadata: {
        correlationId: options.domainEvent.metadata.correlationId,
        causationId: options.domainEvent.id
      }
    });

    flowEvent.metadata.revision = this.instance.revision + this.instance.uncommittedEvents.length + 1;
    this.instance.uncommittedEvents.push(flowEvent);
  };

  this.api = {};
  this.api.forTransitions = {};
  this.api.forTransitions.state = _.cloneDeep(this.definition.initialState);
  this.api.forTransitions.exists = this.instance.exists;
  this.api.forTransitions.setState = newState => {
    if (!newState) {
      throw new Error('New state is missing.');
    }
    _.merge(this.api.forTransitions.state, newState);
  };
  this.api.forTransitions.transitionTo = stateName => {
    if (!stateName) {
      throw new Error('State name is missing.');
    }
    this.api.forTransitions.setState({ is: stateName });
  };

  this.api.forWhen = {};
  this.api.forWhen.state = this.api.forTransitions.state;
  this.api.forWhen.exists = this.instance.exists;
};

FlowAggregate.prototype.applySnapshot = function (snapshot) {
  if (!snapshot) {
    throw new Error('Snapshot is missing.');
  }

  this.instance.revision = snapshot.revision;
  this.api.forTransitions.state = snapshot.state;
  this.api.forWhen.state = snapshot.state;
};

module.exports = FlowAggregate;
