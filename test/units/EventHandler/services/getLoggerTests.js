'use strict';

const assert = require('assertthat'),
      record = require('record-stdstreams'),
      tailwind = require('tailwind');

const getLogger = require('../../../../EventHandler/services/getLogger');

const app = tailwind.createApp({});

const flow = {
  name: 'sample-flow'
};

suite('getLogger', () => {
  test('is a function.', async () => {
    assert.that(getLogger).is.ofType('function');
  });

  test('throws an error if app is missing.', async () => {
    assert.that(() => {
      getLogger({});
    }).is.throwing('App is missing.');
  });

  test('throws an error if flow is missing.', async () => {
    assert.that(() => {
      getLogger({ app });
    }).is.throwing('Flow is missing.');
  });

  test('returns a logger.', async () => {
    const logger = getLogger({ app, flow });

    assert.that(logger).is.ofType('object');
    assert.that(logger.info).is.ofType('function');
  });

  test('returns a logger that uses the correct file name.', async () => {
    const logger = getLogger({ app, flow });

    const stop = record();

    logger.info('Some log message...');

    const { stdout, stderr } = stop();

    const logMessage = JSON.parse(stdout);

    assert.that(logMessage.source).is.equalTo('/wolkenkit/app/server/flows/sample-flow.js');
    assert.that(stderr).is.equalTo('');
  });
});
