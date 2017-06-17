'use strict';

const path = require('path');

const assert = require('assertthat'),
      record = require('record-stdstreams'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const buildEvent = require('../../helpers/buildEvent'),
      EventHandler = require('../../../EventHandler'),
      FlowAggregate = require('../../../repository/FlowAggregate'),
      Services = require('../../../EventHandler/Services');

const app = tailwind.createApp();

const { flows, writeModel } = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', 'app'));

const buildServices = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.domainEvent) {
    throw new Error('Domain event is missing.');
  }
  if (!options.unpublishedCommands) {
    throw new Error('Unpublished commands are missing.');
  }

  const { domainEvent, unpublishedCommands } = options;

  return new Services({
    app,
    domainEvent,
    unpublishedCommands,
    writeModel
  });
};

suite('EventHandler', () => {
  test('is a function.', done => {
    assert.that(EventHandler).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new EventHandler();
      /* eslint-enable no-new */
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if app is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new EventHandler({});
      /* eslint-enable no-new */
    }).is.throwing('App is missing.');
    done();
  });

  suite('forStatelessFlow', () => {
    let eventHandler,
        unpublishedCommands;

    setup(() => {
      eventHandler = new EventHandler({ app });
      unpublishedCommands = [];
    });

    test('is a function.', done => {
      assert.that(eventHandler.forStatelessFlow).is.ofType('function');
      done();
    });

    test('throws an error if options are missing.', done => {
      assert.that(() => {
        eventHandler.forStatelessFlow();
      }).is.throwing('Options are missing.');
      done();
    });

    test('throws an error if flow is missing.', done => {
      assert.that(() => {
        eventHandler.forStatelessFlow({});
      }).is.throwing('Flow is missing.');
      done();
    });

    test('throws an error if domain event is missing.', done => {
      assert.that(() => {
        eventHandler.forStatelessFlow({ flow: {}});
      }).is.throwing('Domain event is missing.');
      done();
    });

    test('throws an error if services are missing.', done => {
      assert.that(() => {
        eventHandler.forStatelessFlow({ flow: {}, domainEvent: {}});
      }).is.throwing('Services are missing.');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const domainEvent = {};
      const services = buildServices({ domainEvent, unpublishedCommands });

      assert.that(() => {
        eventHandler.forStatelessFlow({ flow: {}, domainEvent, services });
      }).is.throwing('Callback is missing.');
      done();
    });

    test('handles events.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'doesNothing', {}),
            flow = flows.unitTestsStateless,
            services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
        assert.that(err).is.null();
        done();
      });
    });

    test('handles events asynchronously.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'doesSomethingAsync', {}),
            flow = flows.unitTestsStateless,
            services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
        assert.that(err).is.null();
        done();
      });
    });

    test('provides services to event listeners that request it.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'withService', {}),
            flow = flows.unitTestsStateless,
            services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
        assert.that(err).is.null();
        done();
      });
    });

    test('returns the unpublished commands.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'sendCommand', {
        initiator: 'Jane Doe',
        destination: 'Riva'
      });

      domainEvent.addUser({ id: uuid() });

      const flow = flows.unitTestsStatelessWithCommands,
            services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
        assert.that(err).is.null();

        assert.that(unpublishedCommands.length).is.equalTo(1);
        assert.that(unpublishedCommands[0].context.name).is.equalTo('planning');
        assert.that(unpublishedCommands[0].aggregate.name).is.equalTo('peerGroup');
        assert.that(unpublishedCommands[0].name).is.equalTo('start');
        assert.that(unpublishedCommands[0].data.initiator).is.equalTo('Jane Doe');
        assert.that(unpublishedCommands[0].data.destination).is.equalTo('Riva');

        done();
      });
    });

    test('does not return an error if a listener fails.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'fail', {}),
            flow = flows.unitTestsStatelessErrorHandling,
            services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Failed to run reaction.')).is.true();
        assert.that(stdout.includes('Something, somewhere, went horribly wrong.')).is.true();
        done();
      });
    });

    test('returns an error if a listener fails asynchronously.', done => {
      const domainEvent = buildEvent('unitTests', 'stateless', 'failAsync', {}),
            flow = flows.unitTestsStatelessErrorHandling,
            services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatelessFlow({ flow, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Failed to run reaction.')).is.true();
        assert.that(stdout.includes('Something, somewhere, went horribly wrong.')).is.true();
        done();
      });
    });
  });

  suite('forStatefulFlow', () => {
    let eventHandler,
        flowId,
        unpublishedCommands;

    setup(() => {
      eventHandler = new EventHandler({ app });
      flowId = uuid();
      unpublishedCommands = [];
    });

    test('is a function.', done => {
      assert.that(eventHandler.forStatefulFlow).is.ofType('function');
      done();
    });

    test('throws an error if options are missing.', done => {
      assert.that(() => {
        eventHandler.forStatefulFlow();
      }).is.throwing('Options are missing.');
      done();
    });

    test('throws an error if flow aggregate is missing.', done => {
      assert.that(() => {
        eventHandler.forStatefulFlow({});
      }).is.throwing('Flow aggregate is missing.');
      done();
    });

    test('throws an error if domain event is missing.', done => {
      assert.that(() => {
        eventHandler.forStatefulFlow({ flowAggregate: {}});
      }).is.throwing('Domain event is missing.');
      done();
    });

    test('throws an error if services are missing.', done => {
      assert.that(() => {
        eventHandler.forStatefulFlow({ flowAggregate: {}, domainEvent: {}});
      }).is.throwing('Services are missing.');
      done();
    });

    test('throws an error if callback is missing.', done => {
      assert.that(() => {
        eventHandler.forStatefulFlow({ flowAggregate: {}, domainEvent: {}, services: {}});
      }).is.throwing('Callback is missing.');
      done();
    });

    test('does not transition the state of the flow aggregate if the flow is not interested in any domain event in the current state at all.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulNotInterestedInAnyEvent', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNotInterestedInAnyEvent', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
        assert.that(err).is.null();
        assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
        assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
        done();
      });
    });

    test('does not transition the state of the flow aggregate if the flow is not interested in the given domain event in the current state.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulNotInterestedInSpecificEvent', 'second', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNotInterestedInSpecificEvent', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
        assert.that(err).is.null();
        assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
        assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
        done();
      });
    });

    test('transitions to failed state if a transition throws an error.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulThrowErrorInTransition', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulThrowErrorInTransition', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
        assert.that(err).is.null();
        assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
        assert.that(flowAggregate.instance.uncommittedEvents[0].name).is.equalTo('transitioned');
        assert.that(flowAggregate.instance.uncommittedEvents[0].data).is.equalTo({
          state: { is: 'failed' }
        });
        assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('failed');
        done();
      });
    });

    test('publishes a transitioned event.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulTransitions', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulTransitions', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
        assert.that(err).is.null();
        assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
        assert.that(flowAggregate.instance.uncommittedEvents[0].name).is.equalTo('transitioned');
        assert.that(flowAggregate.instance.uncommittedEvents[0].data).is.equalTo({
          state: { is: 'completed', port: 3000 }
        });
        assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
        done();
      });
    });

    test('does not react to a transition if there are no when handlers for the previous state.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulNoWhenForPrevious', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNoWhenForPrevious', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Should not be recorded by the tests.')).is.false();
        done();
      });
    });

    test('does not react to a transition if there are no when handlers for the next state.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulNoWhenForNext', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulNoWhenForNext', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Should not be recorded by the tests.')).is.false();
        done();
      });
    });

    test('reacts to a transition if there is a when handler.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulWithReaction', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithReaction', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Should be recorded by the tests.')).is.true();
        done();
      });
    });

    test('logs an error if reaction is marked as failed.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulWithFailingReaction', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithFailingReaction', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Failed to run reaction.')).is.true();
        assert.that(stdout.includes('Something went wrong.')).is.true();
        done();
      });
    });

    test('logs an error if reaction throws an error.', done => {
      const domainEvent = buildEvent('unitTests', 'statefulWithThrowingReaction', 'first', {});

      const flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStatefulWithThrowingReaction', id: flowId },
        domainEvent
      });

      const services = buildServices({ domainEvent, unpublishedCommands });

      record(stop => {
        eventHandler.forStatefulFlow({ flowAggregate, domainEvent, services }, err => {
          assert.that(err).is.null();
          stop();
        });
      }, (err, stdout) => {
        assert.that(err).is.null();
        assert.that(stdout.includes('Failed to run reaction.')).is.true();
        assert.that(stdout.includes('Something went wrong.')).is.true();
        done();
      });
    });
  });
});
