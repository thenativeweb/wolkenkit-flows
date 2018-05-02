'use strict';

const path = require('path');

const processEnv = require('processenv'),
      tailwind = require('tailwind'),
      WolkenkitApplication = require('wolkenkit-application');

const logic = require('./appLogic'),
      repository = require('./repository');

const eventStore = require(`wolkenkit-eventstore/${processEnv('EVENTSTORE_TYPE')}`);

(async () => {
  const app = tailwind.createApp({
    profiling: {
      host: processEnv('PROFILING_HOST'),
      port: processEnv('PROFILING_PORT')
    }
  });

  const applicationDirectory = path.join(app.dirname, 'app');
  const { flows, writeModel } = new WolkenkitApplication(applicationDirectory);

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
})();
