'use strict';

const assert = require('assertthat'),
      uuid = require('uuidv4');

const loadFlowAggregate = require('../../../../appLogic/runStatefulFlows/loadFlowAggregate');

suite('loadFlowAggregate', () => {
  test('is a function.', done => {
    assert.that(loadFlowAggregate).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      loadFlowAggregate();
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      loadFlowAggregate({});
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if flow is missing.', done => {
    assert.that(() => {
      loadFlowAggregate({ domainEvent: {}});
    }).is.throwing('Flow is missing.');
    done();
  });

  test('throws an error if repository is missing.', done => {
    assert.that(() => {
      loadFlowAggregate({ domainEvent: {}, flow: {}});
    }).is.throwing('Repository is missing.');
    done();
  });

  suite('workflow step', () => {
    test('is a function.', done => {
      const workflowStep = loadFlowAggregate({
        domainEvent: {},
        flow: {},
        repository: {}
      });

      assert.that(workflowStep).is.ofType('function');
      done();
    });

    test('throws an error if flow id is missing.', done => {
      const workflowStep = loadFlowAggregate({
        domainEvent: {},
        flow: {},
        repository: {}
      });

      assert.that(() => {
        workflowStep();
      }).is.throwing('Flow id is missing.');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const workflowStep = loadFlowAggregate({
        domainEvent: {},
        flow: {},
        repository: {}
      });

      const flowId = uuid();

      assert.that(() => {
        workflowStep(flowId);
      }).is.throwing('Callback is missing.');
      done();
    });

    test('loads the flow aggregate from the repository.', done => {
      const flowAggregate = {},
            flowId = uuid();

      const givenOptions = {
        domainEvent: {},
        flow: {
          name: 'some-flow'
        },
        repository: {
          loadAggregateForDomainEvent (options, callback) {
            assert.that(options).is.ofType('object');
            assert.that(options.aggregate).is.ofType('object');
            assert.that(options.aggregate.name).is.equalTo(givenOptions.flow.name);
            assert.that(options.aggregate.id).is.equalTo(flowId);
            assert.that(options.domainEvent).is.sameAs(givenOptions.domainEvent);
            assert.that(callback).is.ofType('function');
            callback(null, flowAggregate);
          }
        }
      };

      const workflowStep = loadFlowAggregate(givenOptions);

      workflowStep(flowId, (err, returnedFlowAggregate) => {
        assert.that(err).is.null();
        assert.that(returnedFlowAggregate).is.sameAs(flowAggregate);
        done();
      });
    });

    test('returns an error when the event handler returns an error.', done => {
      const flowId = uuid();

      const givenOptions = {
        domainEvent: {},
        flow: {
          name: 'some-flow'
        },
        repository: {
          loadAggregateForDomainEvent (options, callback) {
            callback(new Error('Something went wrong.'));
          }
        }
      };

      const workflowStep = loadFlowAggregate(givenOptions);

      workflowStep(flowId, err => {
        assert.that(err).is.not.null();
        assert.that(err.message).is.equalTo('Something went wrong.');
        done();
      });
    });
  });
});
