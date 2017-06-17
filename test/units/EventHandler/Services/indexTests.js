'use strict';

const assert = require('assertthat'),
      tailwind = require('tailwind');

const Services = require('../../../../EventHandler/Services');

const app = tailwind.createApp();

suite('Services', () => {
  test('is a function.', done => {
    assert.that(Services).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', done => {
    assert.that(() => {
      /* eslint-disable no-new */
      new Services();
      /* eslint-enable no-new */
    }).is.throwing('Options are missing.');
    done();
  });

  suite('get', () => {
    let services;

    setup(() => {
      services = new Services({ app });
    });

    test('is a function.', done => {
      assert.that(services.get).is.ofType('function');
      done();
    });

    test('throws an error if service name is missing.', done => {
      assert.that(() => {
        services.get();
      }).is.throwing('Service name is missing.');
      done();
    });

    test('throws an error if the requested service does not exist.', done => {
      assert.that(() => {
        services.get('unknown-service');
      }).is.throwing(`Unknown service 'unknown-service'.`);
      done();
    });

    test('returns the requested service.', done => {
      const logger = services.get('logger');

      assert.that(logger).is.ofType('object');
      assert.that(logger.info).is.ofType('function');
      done();
    });
  });
});
