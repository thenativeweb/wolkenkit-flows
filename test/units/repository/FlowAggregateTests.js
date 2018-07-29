'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      assert = require('assertthat'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4');

const buildEvent = require('../../shared/buildEvent'),
      FlowAggregate = require('../../../repository/FlowAggregate');

const app = tailwind.createApp({});

suite('FlowAggregate', () => {
  let domainEvent,
      flowAggregate,
      flowId,
      flows;

  suiteSetup(async () => {
    flows = (await applicationManager.load({
      directory: path.join(__dirname, '..', '..', '..', 'app')
    })).flows;
  });

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

  test('is a function.', async () => {
    assert.that(FlowAggregate).is.ofType('function');
  });

  test('throws an error if app is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({});
      /* eslint-enable no-new */
    }).is.throwing('App is missing.');
  });

  test('throws an error if flows are missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app });
      /* eslint-enable no-new */
    }).is.throwing('Flows are missing.');
  });

  test('throws an error if aggregate is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows });
      /* eslint-enable no-new */
    }).is.throwing('Aggregate is missing.');
  });

  test('throws an error if aggregate name is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: {}});
      /* eslint-enable no-new */
    }).is.throwing('Aggregate name is missing.');
  });

  test('throws an error if aggregate id is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: { name: 'unitTestsStateful' }});
      /* eslint-enable no-new */
    }).is.throwing('Aggregate id is missing.');
  });

  test('throws an error if domain event is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new FlowAggregate({ app, flows, aggregate: { name: 'unitTestsStateful', id: uuid() }});
      /* eslint-enable no-new */
    }).is.throwing('Domain event is missing.');
  });

  test('throws an error if a non-existent flow is given as aggregate name.', async () => {
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
  });

  suite('definition', () => {
    test('contains the appropriate aggregate definition from flows.', async () => {
      assert.that(flowAggregate.definition).is.ofType('object');
      assert.that(flowAggregate.definition.initialState).is.equalTo({ is: 'pristine' });
      assert.that(flowAggregate.definition.transitions.pristine['unitTests.stateful.first']).is.ofType('function');
      assert.that(flowAggregate.definition.reactions.pristine.completed).is.ofType('function');
    });
  });

  suite('instance', () => {
    suite('id', () => {
      test('contains the requested flow id.', async () => {
        assert.that(flowAggregate.instance.id).is.equalTo(flowId);
      });
    });

    suite('revision', () => {
      test('is 0.', async () => {
        assert.that(flowAggregate.instance.revision).is.equalTo(0);
      });
    });

    suite('uncommitted events', () => {
      test('is an empty array.', async () => {
        assert.that(flowAggregate.instance.uncommittedEvents).is.equalTo([]);
      });
    });

    suite('exists', () => {
      test('is a function.', async () => {
        assert.that(flowAggregate.instance.exists).is.ofType('function');
      });

      test('returns false if revision is 0.', async () => {
        assert.that(flowAggregate.instance.exists()).is.false();
      });

      test('returns true if revision is greater than 0.', async () => {
        const snapshot = {
          state: { is: 'completed' },
          revision: 23
        };

        flowAggregate.applySnapshot(snapshot);

        assert.that(flowAggregate.instance.exists()).is.true();
      });
    });

    suite('events', () => {
      suite('publish', () => {
        test('is a function.', async () => {
          assert.that(flowAggregate.instance.events.publish).is.ofType('function');
        });

        test('throws an error if event name is missing.', async () => {
          assert.that(() => {
            flowAggregate.instance.events.publish();
          }).is.throwing('Event name is missing.');
        });

        test('throws an error if an event name not equal to \'transitioned\' is given.', async () => {
          assert.that(() => {
            flowAggregate.instance.events.publish('doneSomething');
          }).is.throwing('Invalid operation.');
        });

        test('does not throw an error if data is missing.', async () => {
          assert.that(() => {
            flowAggregate.instance.events.publish('transitioned');
          }).is.not.throwing();
        });

        test('creates a new event and adds it to the list of uncommitted events.', async () => {
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
        });

        test('sets the correlation and the causation id of the new event.', async () => {
          flowAggregate.instance.events.publish('transitioned', {
            is: 'completed'
          });

          assert.that(flowAggregate.instance.uncommittedEvents.length).is.equalTo(1);
          assert.that(flowAggregate.instance.uncommittedEvents[0].metadata.correlationId).is.equalTo(domainEvent.metadata.correlationId);
          assert.that(flowAggregate.instance.uncommittedEvents[0].metadata.causationId).is.equalTo(domainEvent.id);
        });

        test('does not increase the aggregate revision.', async () => {
          flowAggregate.instance.events.publish('transitioned', {
            is: 'completed'
          });

          assert.that(flowAggregate.instance.revision).is.equalTo(0);
        });
      });
    });
  });

  suite('api', () => {
    suite('forTransitions', () => {
      suite('state', () => {
        test('contains the initial state.', async () => {
          assert.that(flowAggregate.api.forTransitions.state).is.equalTo(flows.unitTestsStateful.initialState);
        });

        test('is a deep copy.', async () => {
          assert.that(flowAggregate.api.forTransitions.state).is.not.sameAs(flows.unitTestsStateful.initialState);
        });
      });

      suite('exists', () => {
        test('references the instance exists function.', async () => {
          assert.that(flowAggregate.api.forTransitions.exists).is.sameAs(flowAggregate.instance.exists);
        });
      });

      suite('setState', () => {
        test('is a function.', async () => {
          assert.that(flowAggregate.api.forTransitions.setState).is.ofType('function');
        });

        test('throws an error if new state is missing.', async () => {
          assert.that(() => {
            flowAggregate.api.forTransitions.setState();
          }).is.throwing('New state is missing.');
        });

        test('updates the state.', async () => {
          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');
          assert.that(flowAggregate.api.forTransitions.state.port).is.undefined();

          flowAggregate.api.forTransitions.setState({
            is: 'completed',
            port: 3000
          });

          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
          assert.that(flowAggregate.api.forTransitions.state.port).is.equalTo(3000);
        });
      });

      suite('transitionTo', () => {
        test('is a function.', async () => {
          assert.that(flowAggregate.api.forTransitions.transitionTo).is.ofType('function');
        });

        test('throws an error if state name is missing.', async () => {
          assert.that(() => {
            flowAggregate.api.forTransitions.transitionTo();
          }).is.throwing('State name is missing.');
        });

        test('updates the state\'s is property.', async () => {
          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('pristine');

          flowAggregate.api.forTransitions.transitionTo('completed');

          assert.that(flowAggregate.api.forTransitions.state.is).is.equalTo('completed');
        });
      });
    });

    suite('forWhen', () => {
      suite('state', () => {
        test('references the forTransitions state.', async () => {
          assert.that(flowAggregate.api.forWhen.state).is.sameAs(flowAggregate.api.forTransitions.state);
        });
      });

      suite('exists', () => {
        test('references the instance exists function.', async () => {
          assert.that(flowAggregate.api.forWhen.exists).is.sameAs(flowAggregate.instance.exists);
        });
      });
    });
  });

  suite('applySnapshot', () => {
    test('is a function.', async () => {
      assert.that(flowAggregate.applySnapshot).is.ofType('function');
    });

    test('throws an error if snapshot is missing.', async () => {
      assert.that(() => {
        flowAggregate.applySnapshot();
      }).is.throwing('Snapshot is missing.');
    });

    test('overwrites the revision.', async () => {
      const snapshot = {
        state: { is: 'completed' },
        revision: 23
      };

      flowAggregate.applySnapshot(snapshot);

      assert.that(flowAggregate.instance.revision).is.equalTo(23);
    });

    test('overwrites the state.', async () => {
      const snapshot = {
        state: { is: 'completed' },
        revision: 23
      };

      flowAggregate.applySnapshot(snapshot);

      assert.that(flowAggregate.api.forTransitions.state).is.equalTo(snapshot.state);
      assert.that(flowAggregate.api.forWhen.state).is.sameAs(flowAggregate.api.forTransitions.state);
    });
  });
});
