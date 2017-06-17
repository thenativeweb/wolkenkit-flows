'use strict';

const path = require('path');

const assert = require('assertthat'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const App = require('../../../../../EventHandler/Services/app/App'),
      buildEvent = require('../../../../helpers/buildEvent');

const tailwindApp = tailwind.createApp(),
      writeModel = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', '..', '..', 'app')).writeModel;

suite('App', () => {
  let domainEvent,
      unpublishedCommands;

  setup(() => {
    domainEvent = buildEvent('planning', 'peerGroup', 'started', {
      initiator: 'Jane Doe',
      destination: 'Riva'
    });
    domainEvent.addUser({ id: uuid() });

    unpublishedCommands = [];
  });

  test('is a function.', done => {
    assert.that(App).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new App();
      /* eslint-enable no-new */
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if app is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new App({});
      /* eslint-enable no-new */
    }).is.throwing('App is missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new App({ app: tailwindApp });
      /* eslint-enable no-new */
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if unpublished commands are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new App({ app: tailwindApp, domainEvent });
      /* eslint-enable no-new */
    }).is.throwing('Unpublished commands are missing.');
    done();
  });

  test('throws an error if write model is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new App({ app: tailwindApp, domainEvent, unpublishedCommands });
      /* eslint-enable no-new */
    }).is.throwing('Write model is missing.');
    done();
  });

  test('has contexts.', done => {
    const instance = new App({ app: tailwindApp, domainEvent, unpublishedCommands, writeModel });

    assert.that(instance.planning).is.ofType('object');
    done();
  });

  suite('contexts', () => {
    let instance;

    setup(() => {
      instance = new App({ app: tailwindApp, domainEvent, unpublishedCommands, writeModel });
    });

    test('contains aggregates and commands defined by the write model.', done => {
      assert.that(instance.planning.peerGroup).is.ofType('function');
      assert.that(instance.planning.peerGroup().start).is.ofType('function');
      assert.that(instance.planning.peerGroup().join).is.ofType('function');
      done();
    });

    suite('commands', () => {
      test('adds the desired command as uncommitted command to the flow aggregate.', done => {
        instance.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands.length).is.equalTo(1);
        assert.that(unpublishedCommands[0].context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[0].aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[0].name).is.equalTo('start');
        assert.that(unpublishedCommands[0].data).is.equalTo({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        done();
      });

      test('adds multiple commands as uncommitted commands to the flow aggregate.', done => {
        instance.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });
        instance.planning.peerGroup().join({
          participant: 'Jenny Doe'
        });

        assert.that(unpublishedCommands.length).is.equalTo(2);
        assert.that(unpublishedCommands[0].context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[0].aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[0].name).is.equalTo('start');
        assert.that(unpublishedCommands[0].data).is.equalTo({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[1].context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[1].aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[1].name).is.equalTo('join');
        assert.that(unpublishedCommands[1].data).is.equalTo({
          participant: 'Jenny Doe'
        });

        done();
      });

      test('sets the correlation id of the given domain event.', done => {
        instance.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[0].metadata.correlationId).is.equalTo(domainEvent.metadata.correlationId);
        done();
      });

      test('adds the user of the given domain event.', done => {
        instance.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        });

        assert.that(unpublishedCommands[0].user.id).is.equalTo(domainEvent.user.id);
        done();
      });

      test('impersonates the command user if a user is given.', done => {
        const asUser = uuid();

        instance.planning.peerGroup().start({
          initiator: 'Jane Doe',
          destination: 'Riva'
        }, { asUser });

        assert.that(unpublishedCommands[0].user.id).is.equalTo(asUser);
        done();
      });
    });
  });
});
