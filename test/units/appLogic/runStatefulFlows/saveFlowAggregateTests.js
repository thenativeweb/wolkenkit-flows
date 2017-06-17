'use strict';

const assert = require('assertthat');

const saveFlowAggregate = require('../../../../appLogic/runStatefulFlows/saveFlowAggregate');

suite('saveFlowAggregate', () => {
  test('is a function.', done => {
    assert.that(saveFlowAggregate).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      saveFlowAggregate();
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if repository is missing.', done => {
    assert.that(() => {
      saveFlowAggregate({});
    }).is.throwing('Repository is missing.');
    done();
  });

  suite('workflow step', () => {
    test('is a function.', done => {
      const workflowStep = saveFlowAggregate({
        repository: {}
      });

      assert.that(workflowStep).is.ofType('function');
      done();
    });

    test('throws an error if flow aggregate is missing.', done => {
      const workflowStep = saveFlowAggregate({
        repository: {}
      });

      assert.that(() => {
        workflowStep();
      }).is.throwing('Flow aggregate is missing.');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const workflowStep = saveFlowAggregate({
        repository: {}
      });

      const flowAggregate = {};

      assert.that(() => {
        workflowStep(flowAggregate);
      }).is.throwing('Callback is missing.');
      done();
    });

    test('saves the flow aggregate to the repository.', done => {
      const flowAggregate = {};

      const givenOptions = {
        repository: {
          saveAggregate (flowAggregateToSave, callback) {
            assert.that(flowAggregateToSave).is.sameAs(flowAggregate);
            assert.that(callback).is.ofType('function');
            callback(null);
          }
        }
      };

      const workflowStep = saveFlowAggregate(givenOptions);

      workflowStep(flowAggregate, err => {
        assert.that(err).is.null();
        done();
      });
    });

    test('returns an error when the repository returns an error.', done => {
      const flowAggregate = {};

      const givenOptions = {
        repository: {
          saveAggregate (flowAggregateToSave, callback) {
            callback(new Error('Something went wrong.'));
          }
        }
      };

      const workflowStep = saveFlowAggregate(givenOptions);

      workflowStep(flowAggregate, err => {
        assert.that(err).is.not.null();
        assert.that(err.message).is.equalTo('Something went wrong.');
        done();
      });
    });
  });
});
