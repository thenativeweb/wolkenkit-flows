'use strict';

const path = require('path');

const assert = require('assertthat'),
      record = require('record-stdstreams'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const buildEvent = require('../../shared/buildEvent'),
      EventHandler = require('../../../EventHandler'),
      FlowAggregate = require('../../../repository/FlowAggregate');

const app = tailwind.createApp({});

const { flows, writeModel } = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', 'app'));

suite('EventHandler', () => {
  test('is a function.', async () => {
    assert.that(EventHandler).is.ofType('function');
  });

  test('throws an error if app is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new EventHandler({});
      /* eslint-enable no-new */
    }).is.throwing('App is missing.');
  });

  test('throws an error if write model is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new EventHandler({ app });
      /* eslint-enable no-new */
    }).is.throwing('Write model is missing.');
  });

  suite('forStatelessFlow', () => {
    let eventHandler,
        unpublishedCommands;

    setup(() => {
      eventHandler = new EventHandler({ app, writeModel });
      unpublishedCommands = [];
    });

    test('is a function.', async () => {
      assert.that(eventHandler.forStatelessFlow).is.ofType('function');
    });

    test('throws an error if flow is missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatelessFlow({});
      }).is.throwingAsync('Flow is missing.');
    });

    test('throws an error if domain event is missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatelessFlow({ flow: {}});
      }).is.throwingAsync('Domain event is missing.');
    });

    test('throws an error if unpublished commands are missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatelessFlow({ flow: {}, domainEvent: {}});
      }).is.throwingAsync('Unpublished commands are missing.');
    });

    test('handles events.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'doesNothing', {}),
            flow = flows.unitTestsStateless;

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });
    });

    test('handles events asynchronously.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'doesSomethingAsync', {}),
            flow = flows.unitTestsStateless;

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });
    });

    test('provides services to event listeners that request it.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'withService', {}),
            flow = flows.unitTestsStateless;

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });
    });

    test('returns the unpublished commands.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'sendCommand', {
        initiator: 'Jane Doe',
        destination: 'Riva'
      });

      domainEvent.addUser({ id: uuid() });

      const flow = flows.unitTestsStatelessWithCommands;

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });

      assert.that(unpublishedCommands.length).is.equalTo(1);
      assert.that(unpublishedCommands[0].context.name).is.equalTo('planning');
      assert.that(unpublishedCommands[0].aggregate.name).is.equalTo('peerGroup');
      assert.that(unpublishedCommands[0].name).is.equalTo('start');
      assert.that(unpublishedCommands[0].data.initiator).is.equalTo('Jane Doe');
      assert.that(unpublishedCommands[0].data.destination).is.equalTo('Riva');
    });

    test('does not return an error if a listener fails.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'fail', {}),
            flow = flows.unitTestsStatelessErrorHandling;

      const stop = record();

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Failed to run reaction.')).is.true();
      assert.that(stdout.includes('Something, somewhere, went horribly wrong.')).is.true();
    });

    test('returns an error if a listener fails asynchronously.', async () => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'failAsync', {}),
            flow = flows.unitTestsStatelessErrorHandling;

      const stop = record();

      await eventHandler.forStatelessFlow({ flow, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Failed to run reaction.')).is.true();
      assert.that(stdout.includes('Something, somewhere, went horribly wrong.')).is.true();
    });
  });

  suite('forStatefulFlow', () => {
    let eventHandler,
        flowId,
        unpublishedCommands;

    setup(() => {
      eventHandler = new EventHandler({ app, writeModel });
      flowId = uuid();
      unpublishedCommands = [];
    });

    test('is a function.', async () => {
      assert.that(eventHandler.forStatefulFlow).is.ofType('function');
    });

    test('throws an error if flow is missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatefulFlow({});
      }).is.throwingAsync('Flow is missing.');
    });

    test('throws an error if flow aggregate is missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatefulFlow({ flow: {}});
      }).is.throwingAsync('Flow aggregate is missing.');
    });

    test('throws an error if domain event is missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatefulFlow({ flow: {}, flowAggregate: {}});
      }).is.throwingAsync('Domain event is missing.');
    });

    test('throws an error if unpublished commands are missing.', async () => {
      await assert.that(async () => {
        await eventHandler.forStatefulFlow({ flow: {}, flowAggregate: {}, domainEvent: {}});
      }).is.throwingAsync('Unpublished commands are missing.');
    });

    test('does not transition the state of the flow aggregate if the flow is not interested in any domain event in the current state at all.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulNotInterestedInAnyEvent', 'first', {}),
            flow = flows.unitTestsStatefulNotInterestedInAnyEvent;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNotInterestedInAnyEvent', id: flowId },
        domainEvent
      });

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
      assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
    });

    test('does not transition the state of the flow aggregate if the flow is not interested in the given domain event in the current state.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulNotInterestedInSpecificEvent', 'second', {}),
            flow = flows.unitTestsStatefulNotInterestedInSpecificEvent;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNotInterestedInSpecificEvent', id: flowId },
        domainEvent
      });

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
      assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
    });

    test('transitions to failed state if a transition throws an error.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulThrowErrorInTransition', 'first', {}),
            flow = flows.unitTestsStatefulThrowErrorInTransition;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulThrowErrorInTransition', id: flowId },
        domainEvent
      });

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
      assert.that(flowAggregate.instance.uncommittedEvents[0].name).is.equalTo('transitioned');
      assert.that(flowAggregate.instance.uncommittedEvents[0].data).is.equalTo({
        state: { is: 'failed' }
      });
      assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('failed');
    });

    test('publishes a transitioned event.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulTransitions', 'first', {}),
            flow = flows.unitTestsStatefulTransitions;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulTransitions', id: flowId },
        domainEvent
      });

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
      assert.that(flowAggregate.instance.uncommittedEvents[0].name).is.equalTo('transitioned');
      assert.that(flowAggregate.instance.uncommittedEvents[0].data).is.equalTo({
        state: { is: 'completed', port: 3000 }
      });
      assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
    });

    test('does not react to a transition if there are no when handlers for the previous state.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulNoWhenForPrevious', 'first', {}),
            flow = flows.unitTestsStatefulNoWhenForPrevious;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNoWhenForPrevious', id: flowId },
        domainEvent
      });

      const stop = record();

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Should not be recorded by the tests.')).is.false();
    });

    test('does not react to a transition if there are no when handlers for the next state.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulNoWhenForNext', 'first', {}),
            flow = flows.unitTestsStatefulNoWhenForNext;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNoWhenForNext', id: flowId },
        domainEvent
      });

      const stop = record();

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Should not be recorded by the tests.')).is.false();
    });

    test('reacts to a transition if there is a when handler.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulWithReaction', 'first', {}),
            flow = flows.unitTestsStatefulWithReaction;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithReaction', id: flowId },
        domainEvent
      });

      const stop = record();

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Should be recorded by the tests.')).is.true();
    });

    test('logs an error if reaction is marked as failed.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulWithFailingReaction', 'first', {}),
            flow = flows.unitTestsStatefulWithFailingReaction;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithFailingReaction', id: flowId },
        domainEvent
      });

      const stop = record();

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Failed to run reaction.')).is.true();
      assert.that(stdout.includes('Something went wrong.')).is.true();
    });

    test('logs an error if reaction throws an error.', async () => {
      const domainEvent = buildEvent('unitTests', 'statefulWithThrowingReaction', 'first', {}),
            flow = flows.unitTestsStatefulWithThrowingReaction;

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithThrowingReaction', id: flowId },
        domainEvent
      });

      const stop = record();

      await eventHandler.forStatefulFlow({ flow, flowAggregate, domainEvent, unpublishedCommands });

      const { stdout } = stop();

      assert.that(stdout.includes('Failed to run reaction.')).is.true();
      assert.that(stdout.includes('Something went wrong.')).is.true();
    });
  });
});
