'use strict';

const path = require('path');

const _ = require('lodash'),
      assert = require('assertthat'),
      EventStore = require('sparbuch/lib/postgres/Sparbuch'),
      runfork = require('runfork'),
      tailwind = require('tailwind'),
      toArray = require('streamtoarray'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const buildEvent = require('../../helpers/buildEvent'),
      env = require('../../helpers/env'),
      FlowAggregate = require('../../../repository/FlowAggregate'),
      Repository = require('../../../repository/Repository');

const app = tailwind.createApp({});

const { flows } = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', 'app'));

suite('Repository', () => {
  const eventStore = new EventStore();

  suiteSetup(done => {
    eventStore.initialize({
      url: env.POSTGRES_URL_UNITS,
      namespace: 'testflows'
    }, done);
  });

  suiteTeardown(() => {
    // We don't explicitly run eventStore.destroy() here, because it caused
    // strange problems on CircleCI. The tests hang in the teardown function.
    // This can be tracked down to disposing and destroying the internal pool
    // of knex, which is provided by pool2. We don't have an idea WHY it works
    // this way, but apparently it does.
  });

  setup(done => {
    runfork({
      path: path.join(__dirname, '..', '..', 'helpers', 'runResetPostgres.js'),
      env: {
        NAMESPACE: 'testflows',
        URL: env.POSTGRES_URL_UNITS
      },
      onExit (exitCode) {
        if (exitCode > 0) {
          return done(new Error('Failed to reset PostgreSQL.'));
        }
        done(null);
      }
    }, err => {
      if (err) {
        return done(err);
      }
    });
  });

  test('is a function.', done => {
    assert.that(Repository).is.ofType('function');
    done();
  });

  suite('instance', () => {
    let domainEvent,
        flowAggregate,
        flowId,
        repository;

    setup(() => {
      domainEvent = buildEvent('unitTests', 'stateful', 'first', {});
      flowId = uuid();
      flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'unitTestsStateful', id: flowId },
        domainEvent
      });
      repository = new Repository();
    });

    suite('initialize', () => {
      test('is a function.', done => {
        assert.that(repository.initialize).is.ofType('function');
        done();
      });

      test('throws an error if options are missing.', done => {
        assert.that(() => {
          repository.initialize();
        }).is.throwing('Options are missing.');
        done();
      });

      test('throws an error if app is missing.', done => {
        assert.that(() => {
          repository.initialize({});
        }).is.throwing('App is missing.');
        done();
      });

      test('throws an error if flows are missing.', done => {
        assert.that(() => {
          repository.initialize({ app });
        }).is.throwing('Flows are missing.');
        done();
      });

      test('throws an error if event store is missing.', done => {
        assert.that(() => {
          repository.initialize({ app, flows });
        }).is.throwing('Event store is missing.');
        done();
      });

      test('throws an error if callback is missing.', done => {
        assert.that(() => {
          repository.initialize({ app, flows, eventStore });
        }).is.throwing('Callback is missing.');
        done();
      });

      test('calls the callback.', done => {
        repository.initialize({ app, flows, eventStore }, err => {
          assert.that(err).is.null();
          done();
        });
      });
    });

    suite('loadAggregateForDomainEvent', () => {
      test('is a function.', done => {
        assert.that(repository.loadAggregateForDomainEvent).is.ofType('function');
        done();
      });

      test('throws an error if options are missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent();
        }).is.throwing('Options are missing.');
        done();
      });

      test('throws an error if aggregate is missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent({});
        }).is.throwing('Aggregate is missing.');
        done();
      });

      test('throws an error if aggregate name is missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent({ aggregate: {}});
        }).is.throwing('Aggregate name is missing.');
        done();
      });

      test('throws an error if aggregate id is missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent({ aggregate: { name: 'unitTestsStateful' }});
        }).is.throwing('Aggregate id is missing.');
        done();
      });

      test('throws an error if domain event is missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent({ aggregate: { name: 'unitTestsStateful', id: flowId }});
        }).is.throwing('Domain event is missing.');
        done();
      });

      test('throws an error if callback is missing.', done => {
        assert.that(() => {
          repository.loadAggregateForDomainEvent({
            aggregate: { name: 'unitTestsStateful', id: flowId },
            domainEvent
          });
        }).is.throwing('Callback is missing.');
        done();
      });

      test('returns the aggregate as-is if no events have been saved.', done => {
        repository.initialize({ app, flows, eventStore }, errInitialize => {
          assert.that(errInitialize).is.null();

          const oldState = _.cloneDeep(flowAggregate.api.forTransitions.state);

          repository.loadAggregateForDomainEvent({
            aggregate: { name: 'unitTestsStateful', id: flowId },
            domainEvent
          }, (err, flowAggregateReplayed) => {
            assert.that(err).is.null();
            assert.that(flowAggregateReplayed.api.forTransitions.state).is.equalTo(oldState);
            done();
          });
        });
      });

      test('applies the last previously saved event.', done => {
        repository.initialize({ app, flows, eventStore }, errInitialize => {
          assert.that(errInitialize).is.null();

          const waiting = buildEvent('flows', 'unitTestsStateful', flowId, 'transitioned', { state: { is: 'waiting', port: 3000 }});
          const completed = buildEvent('flows', 'unitTestsStateful', flowId, 'transitioned', { state: { is: 'completed' }});

          waiting.metadata.revision = 1;
          completed.metadata.revision = 2;

          eventStore.saveEvents({
            events: [ waiting, completed ]
          }, errSaveEvents => {
            assert.that(errSaveEvents).is.null();

            repository.loadAggregateForDomainEvent({
              aggregate: { name: 'unitTestsStateful', id: flowId },
              domainEvent
            }, (errLoadAggregate, flowAggregateReplayed) => {
              assert.that(errLoadAggregate).is.null();
              assert.that(flowAggregateReplayed.api.forTransitions.state.is).is.equalTo('completed');
              assert.that(flowAggregateReplayed.api.forTransitions.state.port).is.undefined();
              done();
            });
          });
        });
      });
    });

    suite('saveAggregate', () => {
      test('is a function.', done => {
        assert.that(repository.saveAggregate).is.ofType('function');
        done();
      });

      test('throws an error if aggregate is missing.', done => {
        assert.that(() => {
          repository.saveAggregate();
        }).is.throwing('Aggregate is missing.');
        done();
      });

      test('throws an error if callback is missing.', done => {
        assert.that(() => {
          repository.saveAggregate(flowAggregate);
        }).is.throwing('Callback is missing.');
        done();
      });

      test('does nothing when there are no uncommitted events.', done => {
        repository.initialize({ app, flows, eventStore }, errInitialize => {
          assert.that(errInitialize).is.null();

          repository.saveAggregate(flowAggregate, errSaveAggregate => {
            assert.that(errSaveAggregate).is.null();

            eventStore.getEventStream(flowId, (errGetEventStream, eventStream) => {
              assert.that(errGetEventStream).is.null();

              toArray(eventStream, (errToArray, events) => {
                assert.that(errToArray).is.null();
                assert.that(events.length).is.equalTo(0);
                done();
              });
            });
          });
        });
      });

      test('saves the uncommitted events using the event store.', done => {
        flowAggregate.instance.events.publish('transitioned', { state: { is: 'waiting' }});
        flowAggregate.instance.events.publish('transitioned', { state: { is: 'completed' }});

        repository.initialize({ app, flows, eventStore }, errInitialize => {
          assert.that(errInitialize).is.null();

          repository.saveAggregate(flowAggregate, errSaveAggregate => {
            assert.that(errSaveAggregate).is.null();

            eventStore.getEventStream(flowId, (errGetEventStream, eventStream) => {
              assert.that(errGetEventStream).is.null();

              toArray(eventStream, (errToArray, events) => {
                assert.that(errToArray).is.null();
                assert.that(events.length).is.equalTo(2);
                assert.that(events[0].name).is.equalTo('transitioned');
                assert.that(events[0].data).is.equalTo({ state: { is: 'waiting' }});
                assert.that(events[1].name).is.equalTo('transitioned');
                assert.that(events[1].data).is.equalTo({ state: { is: 'completed' }});
                done();
              });
            });
          });
        });
      });

      test('returns an error if the events could not be saved by the event store.', done => {
        flowAggregate.instance.events.publish('transitioned', {
          state: { is: 'completed' }
        });

        const eventStoreMock = {
          saveEvents (options, callback) {
            callback(new Error('Something went wrong.'));
          }
        };

        repository.initialize({ app, flows, eventStore: eventStoreMock }, errInitialize => {
          assert.that(errInitialize).is.null();

          repository.saveAggregate(flowAggregate, errSaveAggregate => {
            assert.that(errSaveAggregate).is.not.null();
            assert.that(errSaveAggregate.message).is.equalTo('Something went wrong.');
            done();
          });
        });
      });
    });
  });
});
