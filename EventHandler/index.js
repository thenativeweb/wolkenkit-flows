'use strict';

const getServices = require('./services/get');

class EventHandler {
  constructor ({ app, writeModel }) {
    if (!app) {
      throw new Error('App is missing.');
    }
    if (!writeModel) {
      throw new Error('Write model is missing.');
    }

    this.app = app;
    this.writeModel = writeModel;

    this.logger = app.services.getLogger();
  }

  async forStatelessFlow ({ flow, domainEvent, unpublishedCommands }) {
    if (!flow) {
      throw new Error('Flow is missing.');
    }
    if (!domainEvent) {
      throw new Error('Domain event is missing.');
    }
    if (!unpublishedCommands) {
      throw new Error('Unpublished commands are missing.');
    }

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`;
    const eventListener = flow.when[eventName];

    domainEvent.fail = reason => {
      this.logger.error('Failed to run reaction.', { reason });
    };

    const { app, writeModel } = this;
    const services = getServices({ app, domainEvent, flow, unpublishedCommands, writeModel });

    try {
      await eventListener(domainEvent, services);
    } catch (ex) {
      this.logger.error('Failed to run reaction.', { ex });
    }
  }

  async forStatefulFlow ({ flow, flowAggregate, domainEvent, unpublishedCommands }) {
    if (!flow) {
      throw new Error('Flow is missing.');
    }
    if (!flowAggregate) {
      throw new Error('Flow aggregate is missing.');
    }
    if (!domainEvent) {
      throw new Error('Domain event is missing.');
    }
    if (!unpublishedCommands) {
      throw new Error('Unpublished commands are missing.');
    }

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
          previousFlowStateName = flowAggregate.api.forTransitions.state.is;

    const transitionsForPreviousFlowState = flowAggregate.definition.transitions[previousFlowStateName];

    if (!transitionsForPreviousFlowState) {
      return;
    }

    const transition = transitionsForPreviousFlowState[eventName];

    if (!transition) {
      return;
    }

    const { app, writeModel } = this;
    const services = getServices({ app, flow, domainEvent, unpublishedCommands, writeModel });

    try {
      transition(flowAggregate.api.forTransitions, domainEvent);
    } catch (ex) {
      flowAggregate.api.forTransitions.setState({ is: 'failed' });
    }

    flowAggregate.instance.events.publish('transitioned', {
      state: flowAggregate.api.forTransitions.state
    });

    const nextFlowStateName = flowAggregate.api.forTransitions.state.is;
    const whensForPreviousFlowState = flowAggregate.definition.when[previousFlowStateName];

    if (!whensForPreviousFlowState) {
      return;
    }

    const when = whensForPreviousFlowState[nextFlowStateName];

    if (!when) {
      return;
    }

    domainEvent.fail = reason => {
      this.logger.error('Failed to run reaction.', { reason });
    };

    try {
      await when(flowAggregate.api.forWhen, domainEvent, services);
    } catch (ex) {
      this.logger.error('Failed to run reaction.', { ex });
    }
  }
}

module.exports = EventHandler;
