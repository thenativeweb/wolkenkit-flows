'use strict';

const FlowAggregate = require('./FlowAggregate');

class Repository {
  initialize ({ app, flows, eventStore }) {
    if (!app) {
      throw new Error('App is missing.');
    }
    if (!flows) {
      throw new Error('Flows are missing.');
    }
    if (!eventStore) {
      throw new Error('Event store is missing.');
    }

    this.app = app;
    this.logger = app.services.getLogger();
    this.flows = flows;
    this.eventStore = eventStore;
  }

  async loadAggregateForDomainEvent ({ aggregate, domainEvent }) {
    if (!aggregate) {
      throw new Error('Aggregate is missing.');
    }
    if (!aggregate.name) {
      throw new Error('Aggregate name is missing.');
    }
    if (!aggregate.id) {
      throw new Error('Aggregate id is missing.');
    }
    if (!domainEvent) {
      throw new Error('Domain event is missing.');
    }

    const flowAggregate = new FlowAggregate({
      app: this.app,
      flows: this.flows,
      aggregate,
      domainEvent
    });

    const event = await this.eventStore.getLastEvent(flowAggregate.instance.id);

    if (event) {
      flowAggregate.api.forTransitions.state = event.data.state;
      flowAggregate.api.forWhen.state = event.data.state;
      flowAggregate.instance.revision = event.metadata.revision;
    }

    return flowAggregate;
  }

  async saveAggregate ({ aggregate }) {
    if (!aggregate) {
      throw new Error('Aggregate is missing.');
    }

    if (aggregate.instance.uncommittedEvents.length === 0) {
      return;
    }

    await this.eventStore.saveEvents({
      events: aggregate.instance.uncommittedEvents
    });
  }
}

module.exports = Repository;
