'use strict';

class EventHandler {
  constructor ({ app }) {
    if (!app) {
      throw new Error('App is missing.');
    }

    this.logger = app.services.getLogger();
  }

  async forStatelessFlow ({ flow, domainEvent, services }) {
    if (!flow) {
      throw new Error('Flow is missing.');
    }
    if (!domainEvent) {
      throw new Error('Domain event is missing.');
    }
    if (!services) {
      throw new Error('Services are missing.');
    }

    const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`;
    const eventListener = flow.when[eventName];

    domainEvent.fail = reason => {
      this.logger.error('Failed to run reaction.', { reason });
    };

    try {
      await eventListener(domainEvent, services);
    } catch (ex) {
      this.logger.error('Failed to run reaction.', { ex });
    }
  }

  async forStatefulFlow ({ flowAggregate, domainEvent, services }) {
    if (!flowAggregate) {
      throw new Error('Flow aggregate is missing.');
    }
    if (!domainEvent) {
      throw new Error('Domain event is missing.');
    }
    if (!services) {
      throw new Error('Services are missing.');
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
