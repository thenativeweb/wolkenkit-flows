'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      assert = require('assertthat'),
      EventStore = require('wolkenkit-eventstore/dist/postgres/Eventstore'),
      measureTime = require('measure-time'),
      runfork = require('runfork'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4');

const buildEvent = require('../../shared/buildEvent'),
      env = require('../../shared/env'),
      FlowAggregate = require('../../../repository/FlowAggregate'),
      Repository = require('../../../repository/Repository');

const app = tailwind.createApp({});

const outputElapsed = function (elapsed) {
  /* eslint-disable no-console */
  console.log(`Elapsed: ${elapsed.millisecondsTotal}ms`);
  /* eslint-enable no-console */
};

suite('Repository', function () {
  this.timeout(60 * 1000);

  const eventStore = new EventStore();

  let flows;

  suiteSetup(async () => {
    flows = (await applicationManager.load({
      directory: path.join(__dirname, '..', '..', '..', 'app')
    })).flows;

    await eventStore.initialize({
      url: env.POSTGRES_URL_PERFORMANCE,
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
            NAMESPACE: `testflows`,
            URL: env.POSTGRES_URL_PERFORMANCE
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

  suite('instance', () => {
    let domainEvent,
        flowAggregate,
        flowId,
        repository;

    setup(() => {
      domainEvent = buildEvent('performanceTests', 'stateful', 'first', {});
      flowId = uuid();
      flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'performanceTestsStateful', id: flowId },
        domainEvent
      });

      repository = new Repository();

      repository.initialize({ app, flows, eventStore });
    });

    suite('saveAggregate', () => {
      test('writes events.', async () => {
        const count = 10000;

        for (let i = 0; i < count; i++) {
          flowAggregate.instance.events.publish('transitioned', {
            state: { is: 'transitioning' }
          });
        }

        const getElapsed = measureTime();

        await repository.saveAggregate({ aggregate: flowAggregate });

        const elapsed = getElapsed();

        outputElapsed(elapsed);
        assert.that(elapsed.millisecondsTotal).is.lessThan(30 * 1000);
      });
    });

    suite('loadAggregateForDomainEvent', () => {
      test('loads a aggregate.', async () => {
        const count = 1000;

        for (let i = 0; i < count; i++) {
          flowAggregate.instance.events.publish('transitioned', {
            state: { is: 'transitioning' }
          });
        }

        await repository.saveAggregate({ aggregate: flowAggregate });

        const getElapsed = measureTime();

        const aggregate = await repository.loadAggregateForDomainEvent({
          aggregate: { name: 'performanceTestsStateful', id: flowId },
          domainEvent
        });

        const elapsed = getElapsed();

        outputElapsed(elapsed);
        assert.that(aggregate.instance.revision).is.equalTo(count);
        assert.that(aggregate.api.forTransitions.state).is.equalTo({ is: 'transitioning' });
        assert.that(elapsed.millisecondsTotal).is.lessThan(0.01 * 1000);
      });
    });
  });
});
