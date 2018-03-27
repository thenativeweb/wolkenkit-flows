'use strict';

const assert = require('assertthat');

const handleEvent = require('../../../../appLogic/runStatefulFlows/handleEvent');

suite('handleEvent (stateful)', () => {
  test('is a function.', async () => {
    assert.that(handleEvent).is.ofType('function');
  });

  test('throws an error if flow is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({});
    }).is.throwingAsync('Flow is missing.');
  });

  test('throws an error if flow aggregate is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ flow: {}});
    }).is.throwingAsync('Flow aggregate is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ flow: {}, flowAggregate: {}});
    }).is.throwingAsync('Domain event is missing.');
  });

  test('throws an error if event handler is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ flow: {}, flowAggregate: {}, domainEvent: {}});
    }).is.throwingAsync('Event handler is missing.');
  });

  test('throws an error if unpublished commands are missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ flow: {}, flowAggregate: {}, domainEvent: {}, eventHandler: {}});
    }).is.throwingAsync('Unpublished commands are missing.');
  });

  test('calls the event handler.', async () => {
    const domainEvent = {},
          flow = {},
          flowAggregate = {},
          unpublishedCommands = [];

    const eventHandler = {
      async forStatefulFlow (options) {
        assert.that(options).is.ofType('object');
        assert.that(options.flowAggregate).is.sameAs(flowAggregate);
        assert.that(options.domainEvent).is.sameAs(domainEvent);
        assert.that(options.unpublishedCommands).is.sameAs(unpublishedCommands);
      }
    };

    await handleEvent({ flow, flowAggregate, eventHandler, domainEvent, unpublishedCommands });
  });

  test('throws an error when the event handler throws an error.', async () => {
    const domainEvent = {},
          flow = {},
          flowAggregate = {},
          unpublishedCommands = [];

    const eventHandler = {
      async forStatefulFlow () {
        throw new Error('Something went wrong.');
      }
    };

    await assert.that(async () => {
      await handleEvent({ flow, flowAggregate, eventHandler, domainEvent, unpublishedCommands });
    }).is.throwingAsync('Something went wrong.');
  });
});
