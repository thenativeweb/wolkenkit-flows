'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      assert = require('assertthat'),
      cloneDeep = require('lodash/cloneDeep'),
      EventStore = require('wolkenkit-eventstore/lib/postgres/Eventstore'),
      runfork = require('runfork'),
      tailwind = require('tailwind'),
      toArray = require('streamtoarray'),
      uuid = require('uuidv4');

const buildEvent = require('../../shared/buildEvent'),
      env = require('../../shared/env'),
      FlowAggregate = require('../../../repository/FlowAggregate'),
      Repository = require('../../../repository/Repository');

const app = tailwind.createApp({});

suite('Repository', () => {
  const eventStore = new EventStore();

  let flows;

  suiteSetup(async () => {
    flows = (await applicationManager.load({
      directory: path.join(__dirname, '..', '..', '..', 'app')
    })).flows;

    await eventStore.initialize({
      url: env.POSTGRES_URL_UNITS,
      namespace: 'testflows'
    });
  });

  suiteTeardown(async () => {
    await eventStore.destroy();
  });

  setup(async () => {
    await new Promise(async (resolve, reject) => {
      try {
        runfork({
          path: path.join(__dirname, '..', '..', 'shared', 'runResetPostgres.js'),
          env: {
            NAMESPACE: 'testflows',
            URL: env.POSTGRES_URL_UNITS
          },
          onExit (exitCode) {
            if (exitCode > 0) {
              return reject(new Error('Failed to reset PostgreSQL.'));
            }
            resolve();
          }
        });
      } catch (ex) {
        reject(ex);
      }
    });
  });

  test('is a function.', async () => {
    assert.that(Repository).is.ofType('function');
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
      test('is a function.', async () => {
        assert.that(repository.initialize).is.ofType('function');
      });

      test('throws an error if app is missing.', async () => {
        assert.that(() => {
          repository.initialize({});
        }).is.throwing('App is missing.');
      });

      test('throws an error if flows are missing.', async () => {
        assert.that(() => {
          repository.initialize({ app });
        }).is.throwing('Flows are missing.');
      });

      test('throws an error if event store is missing.', async () => {
        assert.that(() => {
          repository.initialize({ app, flows });
        }).is.throwing('Event store is missing.');
      });
    });

    suite('loadAggregateForDomainEvent', () => {
      test('is a function.', async () => {
        assert.that(repository.loadAggregateForDomainEvent).is.ofType('function');
      });

      test('throws an error if aggregate is missing.', async () => {
        await assert.that(async () => {
          await repository.loadAggregateForDomainEvent({});
        }).is.throwingAsync('Aggregate is missing.');
      });

      test('throws an error if aggregate name is missing.', async () => {
        await assert.that(async () => {
          await repository.loadAggregateForDomainEvent({ aggregate: {}});
        }).is.throwingAsync('Aggregate name is missing.');
      });

      test('throws an error if aggregate id is missing.', async () => {
        await assert.that(async () => {
          await repository.loadAggregateForDomainEvent({ aggregate: { name: 'unitTestsStateful' }});
        }).is.throwingAsync('Aggregate id is missing.');
      });

      test('throws an error if domain event is missing.', async () => {
        await assert.that(async () => {
          await repository.loadAggregateForDomainEvent({ aggregate: { name: 'unitTestsStateful', id: flowId }});
        }).is.throwingAsync('Domain event is missing.');
      });

      test('returns the aggregate as-is if no events have been saved.', async () => {
        repository.initialize({ app, flows, eventStore });

        const oldState = cloneDeep(flowAggregate.api.forTransitions.state);

        const flowAggregateReplayed = await repository.loadAggregateForDomainEvent({
          aggregate: { name: 'unitTestsStateful', id: flowId },
          domainEvent
        });

        assert.that(flowAggregateReplayed.api.forTransitions.state).is.equalTo(oldState);
      });

      test('applies the last previously saved event.', async () => {
        repository.initialize({ app, flows, eventStore });

        const waiting = buildEvent('flows', 'unitTestsStateful', flowId, 'transitioned', { state: { is: 'waiting', port: 3000 }});
        const completed = buildEvent('flows', 'unitTestsStateful', flowId, 'transitioned', { state: { is: 'completed' }});

        waiting.metadata.revision = 1;
        completed.metadata.revision = 2;

        await eventStore.saveEvents({
          uncommittedEvents: [
            { event: waiting, state: {}},
            { event: completed, state: {}}
          ]
        });

        const flowAggregateReplayed = await repository.loadAggregateForDomainEvent({
          aggregate: { name: 'unitTestsStateful', id: flowId },
          domainEvent
        });

        assert.that(flowAggregateReplayed.api.forTransitions.state.is).is.equalTo('completed');
        assert.that(flowAggregateReplayed.api.forTransitions.state.port).is.undefined();
      });
    });

    suite('saveAggregate', () => {
      test('is a function.', async () => {
        assert.that(repository.saveAggregate).is.ofType('function');
      });

      test('throws an error if aggregate is missing.', async () => {
        await assert.that(async () => {
          await repository.saveAggregate({});
        }).is.throwingAsync('Aggregate is missing.');
      });

      test('does nothing when there are no uncommitted events.', async () => {
        repository.initialize({ app, flows, eventStore });

        await repository.saveAggregate({ aggregate: flowAggregate });

        const eventStream = await eventStore.getEventStream({ aggregateId: flowId });
        const events = await toArray(eventStream);

        assert.that(events.length).is.equalTo(0);
      });

      test('saves the uncommitted events using the event store.', async () => {
        flowAggregate.instance.events.publish('transitioned', { state: { is: 'waiting' }});
        flowAggregate.instance.events.publish('transitioned', { state: { is: 'completed' }});

        repository.initialize({ app, flows, eventStore });

        await repository.saveAggregate({ aggregate: flowAggregate });

        const eventStream = await eventStore.getEventStream({ aggregateId: flowId });
        const events = await toArray(eventStream);

        assert.that(events.length).is.equalTo(2);
        assert.that(events[0].name).is.equalTo('transitioned');
        assert.that(events[0].data).is.equalTo({ state: { is: 'waiting' }});
        assert.that(events[1].name).is.equalTo('transitioned');
        assert.that(events[1].data).is.equalTo({ state: { is: 'completed' }});
      });

      test('throws an error if the events could not be saved by the event store.', async () => {
        flowAggregate.instance.events.publish('transitioned', {
          state: { is: 'completed' }
        });

        const eventStoreMock = {
          async saveEvents () {
            throw new Error('Something went wrong.');
          }
        };

        repository.initialize({ app, flows, eventStore: eventStoreMock });

        await assert.that(async () => {
          await repository.saveAggregate({ aggregate: flowAggregate });
        }).is.throwingAsync('Something went wrong.');
      });
    });
  });
});
