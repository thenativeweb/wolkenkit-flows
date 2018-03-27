'use strict';

const assert = require('assertthat');

const handleEvent = require('../../../../appLogic/runStatelessFlows/handleEvent');

suite('handleEvent (stateless)', () => {
  test('is a function.', async () => {
    assert.that(handleEvent).is.ofType('function');
  });

  test('throws an error if event handler is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({});
    }).is.throwingAsync('Event handler is missing.');
  });

  test('throws an error if flow is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ eventHandler: {}});
    }).is.throwingAsync('Flow is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ eventHandler: {}, flow: {}});
    }).is.throwingAsync('Domain event is missing.');
  });

  test('throws an error if unpublished commands are missing.', async () => {
    await assert.that(async () => {
      await handleEvent({ eventHandler: {}, flow: {}, domainEvent: {}});
    }).is.throwingAsync('Unpublished commands are missing.');
  });

  test('calls the event handler.', async () => {
    const domainEvent = {},
          flow = {},
          unpublishedCommands = [];

    const eventHandler = {
      async forStatelessFlow (options) {
        assert.that(options).is.ofType('object');
        assert.that(options.flow).is.sameAs(flow);
        assert.that(options.domainEvent).is.sameAs(domainEvent);
        assert.that(options.unpublishedCommands).is.sameAs(unpublishedCommands);
      }
    };

    await handleEvent({ eventHandler, flow, domainEvent, unpublishedCommands });
  });

  test('throws an error when the event handler throws an error.', async () => {
    const domainEvent = {},
          flow = {},
          unpublishedCommands = [];

    const eventHandler = {
      async forStatelessFlow () {
        throw new Error('Something went wrong.');
      }
    };

    await assert.that(async () => {
      await handleEvent({ eventHandler, flow, domainEvent, unpublishedCommands });
    }).is.throwingAsync('Something went wrong.');
  });
});
