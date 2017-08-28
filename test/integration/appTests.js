'use strict';

const EventEmitter = require('events').EventEmitter,
      path = require('path');

const assert = require('assertthat'),
      async = require('async'),
      EventStore = require('sparbuch/lib/postgres/Sparbuch'),
      flaschenpost = require('flaschenpost'),
      hase = require('hase'),
      runfork = require('runfork'),
      shell = require('shelljs'),
      uuid = require('uuidv4');

const buildEvent = require('../helpers/buildEvent'),
      env = require('../helpers/env'),
      waitForHost = require('../helpers/waitForHost'),
      waitForPostgres = require('../helpers/waitForPostgres'),
      waitForRabbitMq = require('../helpers/waitForRabbitMq');

const logger = flaschenpost.getLogger();

suite('integrationTests', function () {
  this.timeout(15 * 1000);

  let appLifecycle,
      commandbus,
      eventStore,
      flowbus,
      mq,
      stopApp;

  const application = 'plcr';

  const waitForCommand = function (commandName, callback) {
    const onData = function (command) {
      command.next();

      if (command.payload.name !== commandName) {
        return;
      }

      commandbus.pause();
      commandbus.removeListener('data', onData);
      callback(command);
    };

    commandbus.on('data', onData);
    commandbus.resume();
  };

  setup(done => {
    const app = path.join(__dirname, '..', '..', 'app.js');

    appLifecycle = new EventEmitter();

    async.series([
      callback => {
        eventStore = new EventStore();
        eventStore.initialize({
          url: env.POSTGRES_URL_INTEGRATION,
          namespace: `${application}flows`
        }, callback);
      },
      callback => {
        hase.connect(env.RABBITMQ_URL_INTEGRATION, (err, messageQueue) => {
          if (err) {
            return callback(err);
          }
          mq = messageQueue;
          callback();
        });
      },
      callback => {
        mq.worker(`${application}::commands`).createReadStream((err, commandStream) => {
          if (err) {
            return callback(err);
          }
          commandbus = commandStream;
          callback(null);
        });
      },
      callback => {
        mq.worker(`${application}::flows`).createWriteStream((err, flowStream) => {
          if (err) {
            return callback(err);
          }
          flowbus = flowStream;
          callback(null);
        });
      },
      callback => {
        runfork({
          path: path.join(__dirname, '..', 'helpers', 'runResetPostgres.js'),
          env: {
            NAMESPACE: `${application}flows`,
            URL: env.POSTGRES_URL_INTEGRATION
          },
          onExit (exitCode, stdout, stderr) {
            if (exitCode > 0) {
              logger.error('Failed to reset PostgreSQL.', { stdout, stderr });

              return callback(new Error('Failed to reset PostgreSQL.'));
            }
            callback(null);
          }
        }, errfork => {
          if (errfork) {
            return callback(errfork);
          }
        });
      },
      callback => {
        runfork({
          path: app,
          env: {
            APPLICATION: application,
            COMMANDBUS_URL: env.RABBITMQ_URL_INTEGRATION,
            FLOWBUS_URL: env.RABBITMQ_URL_INTEGRATION,
            EVENTSTORE_URL: env.POSTGRES_URL_INTEGRATION,
            EVENTSTORE_TYPE: 'postgres',
            PROFILING_HOST: 'localhost',
            PROFILING_PORT: 8125
          },
          onExit (exitCode, stdout, stderr) {
            logger.debug('Recorded stdout and stderr.', { stdout, stderr });

            if (exitCode > 0) {
              logger.error('Failed to run application.');
            }

            appLifecycle.emit('exit', exitCode);
          }
        }, (errRunApp, stop) => {
          if (errRunApp) {
            return callback(errRunApp);
          }

          stopApp = stop;
          setTimeout(() => {
            callback(null);
          }, 2 * 1000);
        });
      }
    ], done);
  });

  teardown(done => {
    mq.connection.close(errMq => {
      if (errMq && errMq.message !== 'Connection closed (Error: Unexpected close)') {
        return done(errMq);
      }

      // We need to delay stopping the app so that RabbitMQ has time to clean up
      // any messages left in the queue.
      setTimeout(() => {
        stopApp();
        done();
      }, 0.25 * 1000);
    });
  });

  test('exits when the connection to the command bus / flow bus is lost.', done => {
    appLifecycle.once('exit', () => {
      shell.exec('docker start rabbitmq-integration');
      waitForRabbitMq({ url: env.RABBITMQ_URL_INTEGRATION }, done);
    });

    shell.exec('docker kill rabbitmq-integration');
  });

  test('exits when the connection to the event store is lost.', done => {
    appLifecycle.once('exit', () => {
      shell.exec('docker start postgres-integration');
      waitForPostgres({ url: env.POSTGRES_URL_INTEGRATION }, err => {
        assert.that(err).is.null();

        // We need to wait for a few seconds after having started
        // PostgreSQL, as it (for whatever reason) takes a long time
        // to actually become available. If we don't do a sleep here,
        // we run into "the database system is starting up" errors.
        setTimeout(() => {
          done();
        }, 5 * 1000);
      });
    });

    shell.exec('docker kill postgres-integration');
  });

  suite('stateless flows', () => {
    suite('without commands', () => {
      test('triggers an external service when a registered event is received.', done => {
        const event = buildEvent('integrationTests', 'stateless', 'callExternalService', {
          port: 3000
        });

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(event);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });
    });

    suite('with commands', () => {
      test('sends a command when a registered event is received.', done => {
        const event = buildEvent('integrationTests', 'stateless', 'sendCommand', {
          destination: 'Riva',
          initiator: 'Jane Doe'
        });

        event.addUser({ id: uuid() });

        waitForCommand('start', command => {
          assert.that(command.payload.context.name).is.equalTo('planning');
          assert.that(command.payload.aggregate.name).is.equalTo('peerGroup');
          assert.that(command.payload.name).is.equalTo('start');
          assert.that(command.payload.data.initiator).is.equalTo(event.data.initiator);
          assert.that(command.payload.data.destination).is.equalTo(event.data.destination);
          assert.that(command.payload.metadata.correlationId).is.equalTo(event.metadata.correlationId);
          assert.that(command.payload.user).is.equalTo({
            id: event.user.id,
            token: { sub: event.user.id }
          });
          done();
        });

        flowbus.write(event);
      });

      test('sends a command as another user when the flow tries to impersonate.', done => {
        const event = buildEvent('integrationTests', 'stateless', 'sendCommandAsUser', {
          destination: 'Riva',
          initiator: 'Jane Doe',
          asUser: uuid()
        });

        event.addUser({ id: uuid() });

        waitForCommand('start', command => {
          assert.that(command.payload.context.name).is.equalTo('planning');
          assert.that(command.payload.aggregate.name).is.equalTo('peerGroup');
          assert.that(command.payload.name).is.equalTo('start');
          assert.that(command.payload.data.initiator).is.equalTo(event.data.initiator);
          assert.that(command.payload.data.destination).is.equalTo(event.data.destination);
          assert.that(command.payload.metadata.correlationId).is.equalTo(event.metadata.correlationId);
          assert.that(command.payload.user).is.equalTo({
            id: event.data.asUser,
            token: { sub: event.data.asUser }
          });
          done();
        });

        flowbus.write(event);
      });
    });

    suite('error handling', () => {
      test('gracefully handles failing event handlers.', done => {
        const invalidEvent = buildEvent('integrationTests', 'stateless', 'fail', {});
        const validEvent = buildEvent('integrationTests', 'stateless', 'callExternalService', {
          port: 3000
        });

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(invalidEvent);
            flowbus.write(validEvent);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });

      test('gracefully handles event handlers that mark events as failed.', done => {
        const invalidEvent = buildEvent('integrationTests', 'stateless', 'markAsFailed', {});
        const validEvent = buildEvent('integrationTests', 'stateless', 'callExternalService', {
          port: 3000
        });

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(invalidEvent);
            flowbus.write(validEvent);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });
    });
  });

  suite('stateful flows', () => {
    suite('without commands', () => {
      test('triggers an external service when a transition causes a reaction.', done => {
        const event = buildEvent('integrationTests', 'statefulPerformTransition', 'callExternalService', {
          port: 3000
        });

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(event);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });

      test('persists state.', done => {
        const eventSetPort = buildEvent('integrationTests', 'statefulPersistState', 'setPort', {
          port: 3000
        });
        const eventCallExternalService = buildEvent('integrationTests', 'statefulPersistState', eventSetPort.aggregate.id, 'callExternalService', {});

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(eventSetPort);
            flowbus.write(eventCallExternalService);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });
    });

    suite('with commands', () => {
      test('sends a command when a registered event is received.', done => {
        const event = buildEvent('integrationTests', 'statefulWithCommand', 'sendCommand', {
          destination: 'Riva',
          initiator: 'Jane Doe'
        });

        event.addUser({ id: uuid() });

        waitForCommand('start', command => {
          assert.that(command.payload.context.name).is.equalTo('planning');
          assert.that(command.payload.aggregate.name).is.equalTo('peerGroup');
          assert.that(command.payload.name).is.equalTo('start');
          assert.that(command.payload.data.initiator).is.equalTo(event.data.initiator);
          assert.that(command.payload.data.destination).is.equalTo(event.data.destination);
          assert.that(command.payload.metadata.correlationId).is.equalTo(event.metadata.correlationId);
          assert.that(command.payload.user).is.equalTo({
            id: event.user.id,
            token: { sub: event.user.id }
          });
          done();
        });

        flowbus.write(event);
      });

      test('sends a command as another user when the flow tries to impersonate.', done => {
        const event = buildEvent('integrationTests', 'statefulWithCommandAndImpersonation', 'sendCommandAsUser', {
          destination: 'Riva',
          initiator: 'Jane Doe',
          asUser: uuid()
        });

        event.addUser({ id: uuid() });

        waitForCommand('start', command => {
          assert.that(command.payload.context.name).is.equalTo('planning');
          assert.that(command.payload.aggregate.name).is.equalTo('peerGroup');
          assert.that(command.payload.name).is.equalTo('start');
          assert.that(command.payload.data.initiator).is.equalTo(event.data.initiator);
          assert.that(command.payload.data.destination).is.equalTo(event.data.destination);
          assert.that(command.payload.metadata.correlationId).is.equalTo(event.metadata.correlationId);
          assert.that(command.payload.user).is.equalTo({
            id: event.data.asUser,
            token: { sub: event.data.asUser }
          });
          done();
        });

        flowbus.write(event);
      });
    });

    suite('error handling', () => {
      test('enters failed state when the transition fails.', done => {
        const event = buildEvent('integrationTests', 'statefulFailedState', 'fail', {});

        async.series({
          startExternalService (callback) {
            runfork({
              path: path.join(__dirname, 'server.js'),
              env: { PORT: 3000 },
              onExit () {
                done();
              }
            }, callback);
          },
          waitForExternalService (callback) {
            waitForHost('http://localhost:3000/', callback);
          },
          sendEventToFlow (callback) {
            flowbus.write(event);
            callback();
          }
        }, err => {
          assert.that(err).is.null();
        });
      });
    });
  });
});
