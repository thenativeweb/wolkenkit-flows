'use strict';

const assert = require('assertthat');

const handleEvent = require('../../../../appLogic/runStatelessFlows/handleEvent');

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

  test('throws an error if event handler is missing.', done => {
    assert.that(() => {
      handleEvent({});
    }).is.throwing('Event handler is missing.');
    done();
  });

  test('throws an error if flow is missing.', done => {
    assert.that(() => {
      handleEvent({ eventHandler: {}});
    }).is.throwing('Flow is missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      handleEvent({ eventHandler: {}, flow: {}});
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if services are missing.', done => {
    assert.that(() => {
      handleEvent({ eventHandler: {}, flow: {}, domainEvent: {}});
    }).is.throwing('Services are missing.');
    done();
  });

  suite('workflow step', () => {
    test('is a function.', done => {
      const workflowStep = handleEvent({
        eventHandler: {},
        flow: {},
        domainEvent: {},
        services: {}
      });

      assert.that(workflowStep).is.ofType('function');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const workflowStep = handleEvent({
        eventHandler: {},
        flow: {},
        domainEvent: {},
        services: {}
      });

      assert.that(() => {
        workflowStep();
      }).is.throwing('Callback is missing.');
      done();
    });

    test('calls the event handler.', done => {
      const givenOptions = {
        eventHandler: {
          forStatelessFlow (options, callback) {
            assert.that(options).is.ofType('object');
            assert.that(options.flow).is.sameAs(givenOptions.flow);
            assert.that(options.domainEvent).is.sameAs(givenOptions.domainEvent);
            assert.that(options.services).is.sameAs(givenOptions.services);
            callback(null);
          }
        },
        flow: {},
        domainEvent: {},
        services: {}
      };

      const workflowStep = handleEvent(givenOptions);

      workflowStep(err => {
        assert.that(err).is.null();
        done();
      });
    });

    test('returns an error when the event handler returns an error.', done => {
      const givenOptions = {
        eventHandler: {
          forStatelessFlow (options, callback) {
            callback(new Error('Something went wrong.'));
          }
        },
        flow: {},
        domainEvent: {},
        services: {}
      };

      const workflowStep = handleEvent(givenOptions);

      workflowStep(err => {
        assert.that(err).is.not.null();
        assert.that(err.message).is.equalTo('Something went wrong.');
        done();
      });
    });
  });
});
