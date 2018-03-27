'use strict';

const path = require('path');

const assert = require('assertthat'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const buildEvent = require('../../helpers/buildEvent'),
      FlowAggregate = require('../../../repository/FlowAggregate');

const app = tailwind.createApp({});

const { flows } = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', 'app'));

suite('FlowAggregate', () => {
  let domainEvent,
      flowAggregate,
      flowId;

  setup(() => {
    domainEvent = buildEvent('unitTests', 'stateful', 'first', {});
    flowId = uuid();
    flowAggregate = new FlowAggregate({
      app,
      flows,
      aggregate: { name: 'unitTestsStateful', id: flowId },
      domainEvent
    });
  });

  test('is a function.', done => {
    assert.that(FlowAggregate).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate();
      /* eslint-enable no-new */
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if app is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({});
      /* eslint-enable no-new */
    }).is.throwing('App is missing.');
    done();
  });

  test('throws an error if flows are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app });
      /* eslint-enable no-new */
    }).is.throwing('Flows are missing.');
    done();
  });

  test('throws an error if aggregate is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows });
      /* eslint-enable no-new */
    }).is.throwing('Aggregate is missing.');
    done();
  });

  test('throws an error if aggregate name is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: {}});
      /* eslint-enable no-new */
    }).is.throwing('Aggregate name is missing.');
    done();
  });

  test('throws an error if aggregate id is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: { name: 'unitTestsStateful' }});
      /* eslint-enable no-new */
    }).is.throwing('Aggregate id is missing.');
    done();
  });

  test('throws an error if domain event is missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: { name: 'unitTestsStateful', id: uuid() }});
      /* eslint-enable no-new */
    }).is.throwing('Domain event is missing.');
    done();
  });

  test('throws an error if a non-existent flow is given as aggregate name.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'nonExistentFlow', id: uuid() },
        domainEvent: {}
      });
      /* eslint-enable no-new */
    }).is.throwing('Flow does not exist.');
    done();
  });

  suite('definition', () => {
    test('contains the appropriate aggregate definition from flows.', done => {
      assert.that(flowAggregate.definition).is.ofType('object');
      assert.that(flowAggregate.definition.initialState).is.equalTo({ is: 'pristine' });
      assert.that(flowAggregate.definition.transitions.pristine['unitTests.stateful.first']).is.ofType('function');
      assert.that(flowAggregate.definition.when.pristine.completed).is.ofType('function');
      done();
    });
  });

  suite('instance', () => {
    suite('id', () => {
      test('contains the requested flow id.', done => {
        assert.that(flowAggregate.instance.id).is.equalTo(flowId);
        done();
      });
    });

    suite('revision', () => {
      test('is 0.', done => {
        assert.that(flowAggregate.instance.revision).is.equalTo(0);
        done();
      });
    });

    suite('uncommitted events', () => {
      test('is an empty array.', done => {
        assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
        done();
      });
    });

    suite('exists', () => {
      test('is a function.', done => {
        assert.that(flowAggregate.instance.exists).is.ofType('function');
        done();
      });

      test('returns false if revision is 0.', done => {
        assert.that(flowAggregate.instance.exists()).is.false();
        done();
      });

      test('returns true if revision is greater than 0.', done => {
        const snapshot = {
          state: { is: 'completed' },
          revision: 23
        };

        flowAggregate.applySnapshot(snapshot);

        assert.that(flowAggregate.instance.exists()).is.true();
        done();
      });
    });

    suite('events', () => {
      suite('publish', () => {
        test('is a function.', done => {
          assert.that(flowAggregate.instance.events.publish).is.ofType('function');
          done();
        });

        test('throws an error if event name is missing.', done => {
          assert.that(() => {
            flowAggregate.instance.events.publish();
          }).is.throwing('Event name is missing.');
          done();
        });

        test('throws an error if an event name not equal to \'transitioned\' is given.', done => {
          assert.that(() => {
            flowAggregate.instance.events.publish('doneSomething');
          }).is.throwing('Invalid operation.');
          done();
        });

        test('does not throw an error if data is missing.', done => {
          assert.that(() => {
            flowAggregate.instance.events.publish('transitioned');
          }).is.not.throwing();
          done();
        });

        test('creates a new event and adds it to the list of uncommitted events.', done => {
          flowAggregate.instance.events.publish('transitioned', {
            is: 'completed'
          });

          assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
          assert.that(flowAggregate.instance.uncommittedEvents[0].context.name).is.equalTo('flows');
          assert.that(flowAggregate.instance.uncommittedEvents[0].aggregate.name).is.equalTo('unitTestsStateful');
          assert.that(flowAggregate.instance.uncommittedEvents[0].aggregate.id).is.equalTo(flowId);
          assert.that(flowAggregate.instance.uncommittedEvents[0].name).is.equalTo('transitioned');
          assert.that(flowAggregate.instance.uncommittedEvents[0].data).is.equalTo({ is: 'completed' });
          assert.that(flowAggregate.instance.uncommittedEvents[0].metadata.revision).is.equalTo(1);
          done();
        });

        test('sets the correlation and the causation id of the new event.', done => {
          flowAggregate.instance.events.publish('transitioned', {
            is: 'completed'
          });

          assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
          assert.that(flowAggregate.instance.uncommittedEvents[0].metadata.correlationId).is.equalTo(domainEvent.metadata.correlationId);
          assert.that(flowAggregate.instance.uncommittedEvents[0].metadata.causationId).is.equalTo(domainEvent.id);
          done();
        });

        test('does not increase the aggregate revision.', done => {
          flowAggregate.instance.events.publish('transitioned', {
            is: 'completed'
          });

          assert.that(flowAggregate.instance.revision).is.equalTo(0);
          done();
        });
      });
    });
  });

  suite('api', () => {
    suite('forTransitions', () => {
      suite('state', () => {
        test('contains the initial state.', done => {
          assert.that(flowAggregate.api.forTransitions.state).is.equalTo(flows.unitTestsStateful.initialState);
          done();
        });

        test('is a deep copy.', done => {
          assert.that(flowAggregate.api.forTransitions.state).is.not.sameAs(flows.unitTestsStateful.initialState);
          done();
        });
      });

      suite('exists', () => {
        test('references the instance exists function.', done => {
          assert.that(flowAggregate.api.forTransitions.exists).is.sameAs(flowAggregate.instance.exists);
          done();
        });
      });

      suite('setState', () => {
        test('is a function.', done => {
          assert.that(flowAggregate.api.forTransitions.setState).is.ofType('function');
          done();
        });

        test('throws an error if new state is missing.', done => {
          assert.that(() => {
            flowAggregate.api.forTransitions.setState();
          }).is.throwing('New state is missing.');
          done();
        });

        test('updates the state.', done => {
          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
          assert.that(flowAggregate.api.forTransitions.state.port).is.undefined();

          flowAggregate.api.forTransitions.setState({
            is: 'completed',
            port: 3000
          });

          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
          assert.that(flowAggregate.api.forTransitions.state.port).is.equalTo(3000);
          done();
        });
      });

      suite('transitionTo', () => {
        test('is a function.', done => {
          assert.that(flowAggregate.api.forTransitions.transitionTo).is.ofType('function');
          done();
        });

        test('throws an error if state name is missing.', done => {
          assert.that(() => {
            flowAggregate.api.forTransitions.transitionTo();
          }).is.throwing('State name is missing.');
          done();
        });

        test('updates the state\'s is property.', done => {
          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');

          flowAggregate.api.forTransitions.transitionTo('completed');

          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
          done();
        });
      });
    });

    suite('forWhen', () => {
      suite('state', () => {
        test('references the forTransitions state.', done => {
          assert.that(flowAggregate.api.forWhen.state).is.sameAs(flowAggregate.api.forTransitions.state);
          done();
        });
      });

      suite('exists', () => {
        test('references the instance exists function.', done => {
          assert.that(flowAggregate.api.forWhen.exists).is.sameAs(flowAggregate.instance.exists);
          done();
        });
      });
    });
  });

  suite('applySnapshot', () => {
    test('is a function.', done => {
      assert.that(flowAggregate.applySnapshot).is.ofType('function');
      done();
    });

    test('throws an error if snapshot is missing.', done => {
      assert.that(() => {
        flowAggregate.applySnapshot();
      }).is.throwing('Snapshot is missing.');
      done();
    });

    test('overwrites the revision.', done => {
      const snapshot = {
        state: { is: 'completed' },
        revision: 23
      };

      flowAggregate.applySnapshot(snapshot);

      assert.that(flowAggregate.instance.revision).is.equalTo(23);
      done();
    });

    test('overwrites the state.', done => {
      const snapshot = {
        state: { is: 'completed' },
        revision: 23
      };

      flowAggregate.applySnapshot(snapshot);

      assert.that(flowAggregate.api.forTransitions.state).is.equalTo(snapshot.state);
      assert.that(flowAggregate.api.forWhen.state).is.sameAs(flowAggregate.api.forTransitions.state);
      done();
    });
  });
});
