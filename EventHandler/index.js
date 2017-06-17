'use strict';

const EventHandler = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.app) {
    throw new Error('App is missing.');
  }

  const { app } = options;

  this.logger = app.services.getLogger();
};

EventHandler.prototype.forStatelessFlow = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.flow) {
    throw new Error('Flow is missing.');
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

  const { flow, domainEvent, services } = options;

  const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`;
  const eventListener = flow.when[eventName];

  const that = this;
  const mark = {
    asDone () {
      process.nextTick(() => callback(null));
    },
    asFailed (reason) {
      const err = new Error(reason);

      that.logger.error('Failed to run reaction.', { err });
      process.nextTick(() => callback(null));
    }
  };

  try {
    if (eventListener.length === 3) {
      eventListener(domainEvent, services, mark);
    } else {
      eventListener(domainEvent, mark);
    }
  } catch (ex) {
    this.logger.error('Failed to run reaction.', { err: ex });
    process.nextTick(() => callback(null));
  }
};

EventHandler.prototype.forStatefulFlow = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.flowAggregate) {
    throw new Error('Flow aggregate is missing.');
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

  const { flowAggregate, domainEvent, services } = options;

  const eventName = `${domainEvent.context.name}.${domainEvent.aggregate.name}.${domainEvent.name}`,
        previousFlowStateName = flowAggregate.api.forTransitions.state.is;

  const transitionsForPreviousFlowState = flowAggregate.definition.transitions[previousFlowStateName];

  if (!transitionsForPreviousFlowState) {
    return process.nextTick(() => callback(null));
  }

  const transition = transitionsForPreviousFlowState[eventName];

  if (!transition) {
    return process.nextTick(() => callback(null));
  }

  try {
    transition(flowAggregate.api.forTransitions, domainEvent);
  } catch (ex) {
    flowAggregate.api.forTransitions.setState({
      is: 'failed'
    });
  }

  flowAggregate.instance.events.publish('transitioned', {
    state: flowAggregate.api.forTransitions.state
  });

  const nextFlowStateName = flowAggregate.api.forTransitions.state.is;
  const whensForPreviousFlowState = flowAggregate.definition.when[previousFlowStateName];

  if (!whensForPreviousFlowState) {
    return process.nextTick(() => callback(null));
  }

  const when = whensForPreviousFlowState[nextFlowStateName];

  if (!when) {
    return process.nextTick(() => callback(null));
  }

  const that = this;
  const mark = {
    asDone () {
      process.nextTick(() => callback(null));
    },
    asFailed (reason) {
      const err = new Error(reason);

      that.logger.error('Failed to run reaction.', { err });
      process.nextTick(() => callback(null));
    }
  };

  try {
    if (when.length === 4) {
      when(flowAggregate.api.forWhen, domainEvent, services, mark);
    } else {
      when(flowAggregate.api.forWhen, domainEvent, mark);
    }
  } catch (ex) {
    this.logger.error('Failed to run reaction.', { err: ex });
    process.nextTick(() => callback(null));
  }
};

module.exports = EventHandler;
