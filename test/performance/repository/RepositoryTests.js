'use strict';

const path = require('path');

const assert = require('assertthat'),
      cases = require('cases'),
      EventStore = require('sparbuch/lib/postgres/Sparbuch'),
      measureTime = require('measure-time'),
      runfork = require('runfork'),
      tailwind = require('tailwind'),
      uuid = require('uuidv4'),
      WolkenkitApplication = require('wolkenkit-application');

const buildEvent = require('../../helpers/buildEvent'),
      env = require('../../helpers/env'),
      FlowAggregate = require('../../../repository/FlowAggregate'),
      Repository = require('../../../repository/Repository');

const app = tailwind.createApp();

const { flows } = new WolkenkitApplication(path.join(__dirname, '..', '..', '..', 'app'));

const outputElapsed = function (elapsed) {
  /* eslint-disable no-console */
  console.log(`Elapsed: ${elapsed.millisecondsTotal}ms`);
  /* eslint-enable no-console */
};

suite('Repository', function () {
  this.timeout(60 * 1000);

  const eventStore = new EventStore();

  suiteSetup(done => {
    eventStore.initialize({
      url: env.POSTGRES_URL_PERFORMANCE,
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
        URL: env.POSTGRES_URL_PERFORMANCE
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

  suite('instance', () => {
    let domainEvent,
        flowAggregate,
        flowId,
        repository;

    setup(done => {
      domainEvent = buildEvent('performanceTests', 'stateful', 'first', {});
      flowId = uuid();
      flowAggregate = new FlowAggregate({
        app,
        flows,
        aggregate: { name: 'performanceTestsStateful', id: flowId },
        domainEvent
      });

      repository = new Repository();

      repository.initialize({ app, flows, eventStore }, done);
    });

    suite('saveAggregate', () => {
      test('writes events.', cases([
        [ 10000, 1 * 1000 ]
      ], (count, expectedMilliseconds, done) => {
        for (let i = 0; i < count; i++) {
          flowAggregate.instance.events.publish('transitioned', {
            state: { is: 'transitioning' }
          });
        }

        const getElapsed = measureTime();

        repository.saveAggregate(flowAggregate, err => {
          const elapsed = getElapsed();

          outputElapsed(elapsed);

          assert.that(err).is.null();
          assert.that(elapsed.millisecondsTotal).is.lessThan(expectedMilliseconds);
          done();
        });
      }));
    });

    suite('loadAggregateForDomainEvent', () => {
      test('loads a aggregate.', cases([
        [ 1000, 0.01 * 1000 ]
      ], (count, expectedMilliseconds, done) => {
        for (let i = 0; i < count; i++) {
          flowAggregate.instance.events.publish('transitioned', {
            state: { is: 'transitioning' }
          });
        }

        repository.saveAggregate(flowAggregate, errSaveAggregate => {
          assert.that(errSaveAggregate).is.null();

          const getElapsed = measureTime();

          repository.loadAggregateForDomainEvent({
            aggregate: { name: 'performanceTestsStateful', id: flowId },
            domainEvent
          }, (err, aggregate) => {
            const elapsed = getElapsed();

            outputElapsed(elapsed);

            assert.that(err).is.null();
            assert.that(aggregate.instance.revision).is.equalTo(count);
            assert.that(aggregate.api.forTransitions.state).is.equalTo({ is: 'transitioning' });
            assert.that(elapsed.millisecondsTotal).is.lessThan(expectedMilliseconds);
            done();
          });
        });
      }));
    });
  });
});
