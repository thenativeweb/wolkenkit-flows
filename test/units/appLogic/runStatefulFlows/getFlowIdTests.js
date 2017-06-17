'use strict';

const assert = require('assertthat'),
      uuid = require('uuidv4');

const getFlowId = require('../../../../appLogic/runStatefulFlows/getFlowId');

suite('getFlowId', () => {
  test('is a function.', done => {
    assert.that(getFlowId).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      getFlowId();
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      getFlowId({});
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if flow is missing.', done => {
    assert.that(() => {
      getFlowId({ domainEvent: {}});
    }).is.throwing('Flow is missing.');
    done();
  });

  suite('workflow step', () => {
    test('is a function.', done => {
      const workflowStep = getFlowId({
        domainEvent: {},
        flow: {}
      });

      assert.that(workflowStep).is.ofType('function');
      done();
    });

    test('throws an error if callback is missing.', done => {
      const workflowStep = getFlowId({
        domainEvent: {},
        flow: {}
      });

      assert.that(() => {
        workflowStep();
      }).is.throwing('Callback is missing.');
      done();
    });

    test('returns the flow id.', done => {
      const aggregateId = uuid();

      const givenOptions = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-flow'
        }
      };

      const workflowStep = getFlowId(givenOptions);

      workflowStep((err, flowId) => {
        assert.that(err).is.null();
        assert.that(flowId).is.equalTo(uuid.fromString(`some-flow-${aggregateId}`));
        done();
      });
    });

    test('derives the flow id from the flow name.', done => {
      const aggregateId = uuid();

      const givenOptions = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-flow'
        }
      };

      const workflowStep = getFlowId(givenOptions);

      workflowStep((err1, flowId1) => {
        assert.that(err1).is.null();

        workflowStep((err2, flowId2) => {
          assert.that(err2).is.null();
          assert.that(flowId1).is.equalTo(flowId2);
          done();
        });
      });
    });

    test('derives different flow ids from different flow names, even if the event is the same.', done => {
      const aggregateId = uuid();

      const givenOptions1 = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-flow'
        }
      };

      const givenOptions2 = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-other-flow'
        }
      };

      const workflowStep1 = getFlowId(givenOptions1);
      const workflowStep2 = getFlowId(givenOptions2);

      workflowStep1((err1, flowId1) => {
        assert.that(err1).is.null();

        workflowStep2((err2, flowId2) => {
          assert.that(err2).is.null();
          assert.that(flowId1).is.not.equalTo(flowId2);
          done();
        });
      });
    });

    test('derives different flow ids for different aggregate ids, even if the flow name and the events are the same.', done => {
      const aggregateId1 = uuid(),
            aggregateId2 = uuid();

      const givenOptions1 = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId1 },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-flow'
        }
      };

      const givenOptions2 = {
        domainEvent: {
          context: { name: 'planning' },
          aggregate: { name: 'peerGroup', id: aggregateId2 },
          name: 'started'
        },
        flow: {
          identity: {
            'planning.peerGroup.started': event => event.aggregate.id
          },
          name: 'some-flow'
        }
      };

      const workflowStep1 = getFlowId(givenOptions1);
      const workflowStep2 = getFlowId(givenOptions2);

      workflowStep1((err1, flowId1) => {
        assert.that(err1).is.null();

        workflowStep2((err2, flowId2) => {
          assert.that(err2).is.null();
          assert.that(flowId1).is.not.equalTo(flowId2);
          done();
        });
      });
    });
  });
});
