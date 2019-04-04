'use strict';

const { EventEmitter } = require('events'),
      path = require('path');

const assert = require('assertthat'),
      EventStore = require('wolkenkit-eventstore/lib/postgres/Eventstore'),
      hase = require('hase'),
      request = require('needle'),
      runfork = require('runfork'),
      shell = require('shelljs'),
      uuid = require('uuidv4');

const buildEvent = require('../shared/buildEvent'),
      env = require('../shared/env'),
      waitForHost = require('../shared/waitForHost'),
      waitForPostgres = require('../shared/waitForPostgres'),
      waitForRabbitMq = require('../shared/waitForRabbitMq');

const isDebugMode = true;

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
      const onData = function (message) {
        const { command, metadata } = message.payload;

        message.next();

        if (command.name !== commandName) {
          return;
        }

        commandbus.pause();
        commandbus.removeListener('data', onData);

        resolve({ command, metadata });
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

    mq = await hase.connect({ url: env.RABBITMQ_URL_INTEGRATION });

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
          path: path.join(__dirname, '..', 'shared', 'runResetPostgres.js'),
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
        PROFILING_PORT: 8125,
        STATUS_PORT: 3001,
        STATUS_CORS_ORIGIN: '*'
      },
      onExit (exitCode) {
        appLifecycle.emit('exit', exitCode);
      },
      silent: !isDebugMode
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

  suite('stateless flows', () => {
    suite('without commands', () => {
      test('triggers an external service when a registered event is received.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const event = buildEvent('integrationTests', 'stateless', 'callExternalService', {
              port: 3000
            });

            flowbus.write({ event, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });
    });

    suite('with commands', () => {
      test('sends a command when a registered event is received.', async () => {
        const event = buildEvent('integrationTests', 'stateless', 'sendCommand', {
          destination: 'Riva',
          initiator: 'Jane Doe'
        });

        event.addInitiator({ id: uuid() });

        process.nextTick(() => {
          flowbus.write({ event, metadata: { state: {}, previousState: {}}});
        });

        const { command } = await waitForCommand('start');

        assert.that(command.context.name).is.equalTo('planning');
        assert.that(command.aggregate.name).is.equalTo('peerGroup');
        assert.that(command.name).is.equalTo('start');
        assert.that(command.data.initiator).is.equalTo(event.data.initiator);
        assert.that(command.data.destination).is.equalTo(event.data.destination);
        assert.that(command.metadata.correlationId).is.equalTo(event.metadata.correlationId);
        assert.that(command.initiator).is.equalTo({
          id: event.initiator.id,
          token: { sub: event.initiator.id }
        });
      });

      test('sends a command as another user when the flow tries to impersonate.', async () => {
        const event = buildEvent('integrationTests', 'stateless', 'sendCommandAsInitiator', {
          destination: 'Riva',
          initiator: 'Jane Doe',
          asInitiator: uuid()
        });

        event.addInitiator({ id: uuid() });

        process.nextTick(() => {
          flowbus.write({ event, metadata: { state: {}, previousState: {}}});
        });

        const { command } = await waitForCommand('start');

        assert.that(command.context.name).is.equalTo('planning');
        assert.that(command.aggregate.name).is.equalTo('peerGroup');
        assert.that(command.name).is.equalTo('start');
        assert.that(command.data.initiator).is.equalTo(event.data.initiator);
        assert.that(command.data.destination).is.equalTo(event.data.destination);
        assert.that(command.metadata.correlationId).is.equalTo(event.metadata.correlationId);
        assert.that(command.initiator).is.equalTo({
          id: event.data.asInitiator,
          token: { sub: event.data.asInitiator }
        });
      });
    });

    suite('error handling', () => {
      test('gracefully handles failing event handlers.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const invalidEvent = buildEvent('integrationTests', 'stateless', 'fail', {});
            const validEvent = buildEvent('integrationTests', 'stateless', 'callExternalService', {
              port: 3000
            });

            flowbus.write({ event: invalidEvent, metadata: { state: {}, previousState: {}}});
            flowbus.write({ event: validEvent, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });

      test('gracefully handles event handlers that mark events as failed.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const invalidEvent = buildEvent('integrationTests', 'stateless', 'markAsFailed', {});
            const validEvent = buildEvent('integrationTests', 'stateless', 'callExternalService', {
              port: 3000
            });

            flowbus.write({ event: invalidEvent, metadata: { state: {}, previousState: {}}});
            flowbus.write({ event: validEvent, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });
    });
  });

  suite('stateful flows', () => {
    suite('without commands', () => {
      test('triggers an external service when a transition causes a reaction.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const event = buildEvent('integrationTests', 'statefulPerformTransition', 'callExternalService', {
              port: 3000
            });

            flowbus.write({ event, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });

      test('persists state.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const eventSetPort = buildEvent('integrationTests', 'statefulPersistState', 'setPort', {
              port: 3000
            });
            const eventCallExternalService = buildEvent('integrationTests', 'statefulPersistState', eventSetPort.aggregate.id, 'callExternalService', {});

            flowbus.write({ event: eventSetPort, metadata: { state: {}, previousState: {}}});
            flowbus.write({ event: eventCallExternalService, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });
    });

    suite('with commands', () => {
      test('sends a command when a registered event is received.', async () => {
        const event = buildEvent('integrationTests', 'statefulWithCommand', 'sendCommand', {
          destination: 'Riva',
          initiator: 'Jane Doe'
        });

        event.addInitiator({ id: uuid() });

        process.nextTick(() => {
          flowbus.write({ event, metadata: { state: {}, previousState: {}}});
        });

        const { command } = await waitForCommand('start');

        assert.that(command.context.name).is.equalTo('planning');
        assert.that(command.aggregate.name).is.equalTo('peerGroup');
        assert.that(command.name).is.equalTo('start');
        assert.that(command.data.initiator).is.equalTo(event.data.initiator);
        assert.that(command.data.destination).is.equalTo(event.data.destination);
        assert.that(command.metadata.correlationId).is.equalTo(event.metadata.correlationId);
        assert.that(command.initiator).is.equalTo({
          id: event.initiator.id,
          token: { sub: event.initiator.id }
        });
      });

      test('sends a command as another user when the flow tries to impersonate.', async () => {
        const event = buildEvent('integrationTests', 'statefulWithCommandAndImpersonation', 'sendCommandAsInitiator', {
          destination: 'Riva',
          initiator: 'Jane Doe',
          asInitiator: uuid()
        });

        event.addInitiator({ id: uuid() });

        process.nextTick(() => {
          flowbus.write({ event, metadata: { state: {}, previousState: {}}});
        });

        const { command } = await waitForCommand('start');

        assert.that(command.context.name).is.equalTo('planning');
        assert.that(command.aggregate.name).is.equalTo('peerGroup');
        assert.that(command.name).is.equalTo('start');
        assert.that(command.data.initiator).is.equalTo(event.data.initiator);
        assert.that(command.data.destination).is.equalTo(event.data.destination);
        assert.that(command.metadata.correlationId).is.equalTo(event.metadata.correlationId);
        assert.that(command.initiator).is.equalTo({
          id: event.data.asInitiator,
          token: { sub: event.data.asInitiator }
        });
      });
    });

    suite('error handling', () => {
      test('enters failed state when the transition fails.', async () => {
        await Promise.all([
          new Promise((resolve, reject) => {
            try {
              runfork({
                path: path.join(__dirname, 'server.js'),
                env: { PORT: 3000 },
                onExit () {
                  resolve();
                }
              });
            } catch (ex) {
              reject(ex);
            }
          }),
          (async () => {
            await waitForHost('http://localhost:3000/');

            const event = buildEvent('integrationTests', 'statefulFailedState', 'fail', {});

            flowbus.write({ event, metadata: { state: {}, previousState: {}}});
          })()
        ]);
      });
    });
  });

  suite('status api', () => {
    test('answers with api version v1.', async () => {
      const res = await request('get', 'http://localhost:3001/v1/status');

      assert.that(res.body).is.equalTo({ api: 'v1' });
    });
  });

  suite('infrastructure outeage', () => {
    test('exits when the connection to the command bus / flow bus is lost.', async function () {
      this.timeout(25 * 1000);

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
  });
});
