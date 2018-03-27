'use strict';

const { EventEmitter } = require('events'),
      path = require('path');

const assert = require('assertthat'),
      async = require('async'),
      EventStore = require('sparbuch/lib/postgres/Sparbuch'),
      hase = require('hase'),
      runfork = require('runfork'),
      shell = require('shelljs'),
      uuid = require('uuidv4');

const buildEvent = require('../helpers/buildEvent'),
      env = require('../helpers/env'),
      waitForHost = require('../helpers/waitForHost'),
      waitForPostgres = require('../helpers/waitForPostgres'),
      waitForRabbitMq = require('../helpers/waitForRabbitMq');

suite('integrationTests', function () {
  this.timeout(15 * 1000);

  let appLifecycle,
      commandbus,
      eventStore,
      flowbus,
      mq,
      stopApp;

  const application = 'plcr';

  const waitForCommand = async function (commandName) {
    const getOnData = function (resolve) {
      const onData = function (command) {
        command.next();

        if (command.payload.name !== commandName) {
          return;
        }

        commandbus.pause();
        commandbus.removeListener('data', onData);

        resolve(command);
      };

      return onData;
    };

    const command = await new Promise(resolve => {
      commandbus.on('data', getOnData(resolve));
      commandbus.resume();
    });

    return command;
  };

  setup(async () => {
    const app = path.join(__dirname, '..', '..', 'app.js');

    appLifecycle = new EventEmitter();

    mq = await hase.connect(env.RABBITMQ_URL_INTEGRATION);

    eventStore = new EventStore();
    await eventStore.initialize({
      url: env.POSTGRES_URL_INTEGRATION,
      namespace: `${application}flows`
    });

    commandbus = await mq.worker(`${application}::commands`).createReadStream();
    flowbus = await mq.worker(`${application}::flows`).createWriteStream();

    await new Promise(async (resolve, reject) => {
      try {
        runfork({
          path: path.join(__dirname, '..', 'helpers', 'runResetPostgres.js'),
          env: {
            NAMESPACE: `${application}flows`,
            URL: env.POSTGRES_URL_INTEGRATION
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

    stopApp = runfork({
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
      onExit (exitCode) {
        appLifecycle.emit('exit', exitCode);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2 * 1000));
  });

  teardown(async () => {
    try {
      await mq.connection.close();
    } catch (ex) {
      if (ex.message !== 'Connection closed (Error: Unexpected close)') {
        throw ex;
      }
    }

    await eventStore.destroy();
    await stopApp();
  });

  test('exits when the connection to the command bus / flow bus is lost.', async () => {
    await new Promise((resolve, reject) => {
      try {
        appLifecycle.once('exit', async () => {
          try {
            shell.exec('docker start rabbitmq-integration');
            await waitForRabbitMq({ url: env.RABBITMQ_URL_INTEGRATION });
          } catch (ex) {
            return reject(ex);
          }
          resolve();
        });

        shell.exec('docker kill rabbitmq-integration');
      } catch (ex) {
        reject(ex);
      }
    });
  });

  test('exits when the connection to the event store is lost.', async () => {
    await new Promise((resolve, reject) => {
      try {
        appLifecycle.once('exit', async () => {
          try {
            shell.exec('docker start postgres-integration');
            await waitForPostgres({ url: env.POSTGRES_URL_INTEGRATION });
          } catch (ex) {
            return reject(ex);
          }
          resolve();
        });

        shell.exec('docker kill postgres-integration');
      } catch (ex) {
        reject(ex);
      }
    });
  });

  suite('stateless flows', () => {
    suite('without commands', () => {
      test.skip('triggers an external service when a registered event is received.', async () => {
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
      test.skip('sends a command when a registered event is received.', async () => {
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

      test.skip('sends a command as another user when the flow tries to impersonate.', async () => {
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
      test.skip('gracefully handles failing event handlers.', async () => {
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

      test.skip('gracefully handles event handlers that mark events as failed.', async () => {
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
      test.skip('triggers an external service when a transition causes a reaction.', async () => {
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

      test.skip('persists state.', async () => {
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
      test.skip('sends a command when a registered event is received.', async () => {
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

      test.skip('sends a command as another user when the flow tries to impersonate.', async () => {
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
      test.skip('enters failed state when the transition fails.', async () => {
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
