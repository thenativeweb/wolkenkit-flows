'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      assert = require('assertthat'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4');

const buildEvent = require('../../../shared/buildEvent'),
      getServices = require('../../../../EventHandler/services/get');

const app = tailwind.createApp({});

suite('getServices', () => {
  let domainEvent,
      flow,
      unpublishedCommands,
      writeModel;

  suiteSetup(async () => {
    writeModel = (await applicationManager.load({
      directory: path.join(__dirname, '..', '..', '..', '..', 'app')
    })).writeModel;
  });

  setup(() => {
    domainEvent = buildEvent('planning', 'peerGroup', 'started', {
      initiator: 'Jane Doe',
      destination: 'Riva'
    });
    domainEvent.addInitiator({ id: uuid() });

    flow = { name: 'sample-flow' };
    unpublishedCommands = [];
  });

  test('is a function.', async () => {
    assert.that(getServices).is.ofType('function');
  });

  test('throws an error if app is missing.', async () => {
    assert.that(() => {
      getServices({});
    }).is.throwing('App is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    assert.that(() => {
      getServices({ app });
    }).is.throwing('Domain event is missing.');
  });

  test('throws an error if flow is missing.', async () => {
    assert.that(() => {
      getServices({ app, domainEvent });
    }).is.throwing('Flow is missing.');
  });

  test('throws an error if unpublished commands are missing.', async () => {
    assert.that(() => {
      getServices({ app, domainEvent, flow });
    }).is.throwing('Unpublished commands are missing.');
  });

  test('throws an error if write model is missing.', async () => {
    assert.that(() => {
      getServices({ app, domainEvent, flow, unpublishedCommands });
    }).is.throwing('Write model is missing.');
  });

  test('returns the services.', async () => {
    const services = getServices({ app, domainEvent, flow, unpublishedCommands, writeModel });

    assert.that(services).is.ofType('object');
    assert.that(services.app).is.ofType('object');
    assert.that(services.logger).is.ofType('object');
  });
});
