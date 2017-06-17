'use strict';

const assert = require('assertthat');

const handleEvent = require('../../../../appLogic/runStatefulFlows/handleEvent');

suite('handleEvent', () => {
  test('is a function.', done => {
    assert.that(handleEvent).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      handleEvent();
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      handleEvent({});
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if event handler is missing.', done => {
    assert.that(() => {
      handleEvent({ domainEvent: {}});
    }).is.throwing('Event handler is missing.');
    done();
  });

  test('throws an error if services are missing.', done => {
    assert.that(() => {
      handleEvent({ domainEvent: {}, eventHandler: {}});
    }).is.throwing('Services are missing.');
    done();
  });

  suite('workflow step', () => {
    test('is a function.', done => {
      const workflowStep = handleEvent({
        domainEvent: {},
        eventHandler: {},
        services: {}
      });

      assert.that(workflowStep).is.ofType('function');
      done();
    });

    test('throws an error if flow aggregate is missing.', done => {
      const workflowStep = handleEvent({
        domainEvent: {},
        eventHandler: {},
        services: {}
      });

      assert.that(() => {
        workflowStep();
      }).is.throwing('Flow aggregate is missing.');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const workflowStep = handleEvent({
        domainEvent: {},
        eventHandler: {},
        services: {}
      });

      const flowAggregate = {};

      assert.that(() => {
        workflowStep(flowAggregate);
      }).is.throwing('Callback is missing.');
      done();
    });

    test('calls the event handler.', done => {
      const flowAggregate = {};
      const givenOptions = {
        domainEvent: {},
        eventHandler: {
          forStatefulFlow (options, callback) {
            assert.that(options).is.ofType('object');
            assert.that(options.flowAggregate).is.sameAs(flowAggregate);
            assert.that(options.domainEvent).is.sameAs(givenOptions.domainEvent);
            assert.that(options.services).is.sameAs(givenOptions.services);
            callback(null);
          }
        },
        services: {}
      };

      const workflowStep = handleEvent(givenOptions);

      workflowStep(flowAggregate, (err, returnedFlowAggregate) => {
        assert.that(err).is.null();
        assert.that(returnedFlowAggregate).is.sameAs(flowAggregate);
        done();
      });
    });

    test('returns an error when the event handler returns an error.', done => {
      const flowAggregate = {};
      const givenOptions = {
        domainEvent: {},
        eventHandler: {
          forStatefulFlow (options, callback) {
            callback(new Error('Something went wrong.'));
          }
        },
        services: {}
      };

      const workflowStep = handleEvent(givenOptions);

      workflowStep(flowAggregate, err => {
        assert.that(err).is.not.null();
        assert.that(err.message).is.equalTo('Something went wrong.');
        done();
      });
    });
  });
});
