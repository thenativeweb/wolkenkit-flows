'use strict';

const path = require('path');

const applicationManager = require('wolkenkit-application'),
      flaschenpost = require('flaschenpost'),
      processEnv = require('processenv'),
      tailwind = require('tailwind');

const logic = require('./appLogic'),
      repository = require('./repository');

const eventStore = require(`wolkenkit-eventstore/${processEnv('EVENTSTORE_TYPE')}`);

const loggerSystem = flaschenpost.getLogger();

(async () => {
  try {
    const app = tailwind.createApp({
      profiling: {
        host: processEnv('PROFILING_HOST'),
        port: processEnv('PROFILING_PORT')
      }
    });

    const applicationDirectory = path.join(app.dirname, 'app');
    const { flows, writeModel } = await applicationManager.load({ directory: applicationDirectory });

    await eventStore.initialize({
      url: app.env('EVENTSTORE_URL'),
      namespace: `${app.env('APPLICATION')}flows`
    });

    repository.initialize({ app, flows, eventStore });

    await app.commandbus.use(new app.wires.commandbus.amqp.Sender({
      url: app.env('COMMANDBUS_URL'),
      application: app.env('APPLICATION')
    }));

    await app.flowbus.use(new app.wires.flowbus.amqp.Receiver({
      url: app.env('FLOWBUS_URL'),
      application: app.env('APPLICATION')
    }));

    await app.status.use(new app.wires.status.http.Server({
      port: app.env('STATUS_PORT'),
      corsOrigin: app.env('STATUS_CORS_ORIGIN')
    }));

    logic({ app, eventStore, flows, writeModel });
  } catch (ex) {
    loggerSystem.fatal('An unexpected error occured.', { err: ex });

    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
})();
