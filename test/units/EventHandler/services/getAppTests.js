'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      assert = require('assertthat'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4');

const buildEvent = require('../../../shared/buildEvent'),
      getApp = require('../../../../EventHandler/services/getApp');

const app = tailwind.createApp({});

suite('getApp', () => {
  let domainEvent,
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

    unpublishedCommands = [];
  });

  test('is a function.', async () => {
    assert.that(getApp).is.ofType('function');
  });

  test('throws an error if app is missing.', async () => {
    assert.that(() => {
      getApp({});
    }).is.throwing('App is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    assert.that(() => {
      getApp({ app });
    }).is.throwing('Domain event is missing.');
  });

  test('throws an error if unpublished commands are missing.', async () => {
    assert.that(() => {
      getApp({ app, domainEvent });
    }).is.throwing('Unpublished commands are missing.');
  });

  test('throws an error if write model is missing.', async () => {
    assert.that(() => {
      getApp({ app, domainEvent, unpublishedCommands });
    }).is.throwing('Write model is missing.');
  });

  test('has contexts.', async () => {
    const appService = getApp({ app, domainEvent, unpublishedCommands, writeModel });

    assert.that(appService.planning).is.ofType('object');
  });

  suite('contexts', () => {
    let appService;

    setup(() => {
      appService = getApp({ app, domainEvent, unpublishedCommands, writeModel });
    });

    test('contains aggregates and commands defined by the write model.', async () => {
      assert.that(appService.planning.peerGroup).is.ofType('function');
      assert.that(appService.planning.peerGroup().start).is.ofType('function');
      assert.that(appService.planning.peerGroup().join).is.ofType('function');
    });

    suite('commands', () => {
      test('adds the desired command as uncommitted command to the flow aggregate.', async () => {
        appService.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands.length).is.equalTo(1);
        assert.that(unpublishedCommands[0].command.context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[0].command.aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[0].command.name).is.equalTo('start');
        assert.that(unpublishedCommands[0].command.data).is.equalTo({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });
      });

      test('adds multiple commands as uncommitted commands to the flow aggregate.', async () => {
        appService.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });
        appService.planning.peerGroup().join({
          participant: 'Jenny Doe'
        });

        assert.that(unpublishedCommands.length).is.equalTo(2);
        assert.that(unpublishedCommands[0].command.context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[0].command.aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[0].command.name).is.equalTo('start');
        assert.that(unpublishedCommands[0].command.data).is.equalTo({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[1].command.context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[1].command.aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[1].command.name).is.equalTo('join');
        assert.that(unpublishedCommands[1].command.data).is.equalTo({
          participant: 'Jenny Doe'
        });
      });

      test('sets the correlation id of the given domain event.', async () => {
        appService.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[0].command.metadata.correlationId).is.equalTo(domainEvent.metadata.correlationId);
      });

      test('adds the user of the given domain event.', async () => {
        appService.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[0].command.initiator.id).is.equalTo(domainEvent.initiator.id);
      });

      test('impersonates the command user if a user is given.', async () => {
        const asInitiator = uuid();

        appService.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        }, { asInitiator });

        assert.that(unpublishedCommands[0].command.initiator.id).is.equalTo(asInitiator);
      });
    });
  });
});
