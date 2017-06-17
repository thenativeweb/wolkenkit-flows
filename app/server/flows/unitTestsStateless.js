'use strict';

const when = {
  'unitTests.stateless.doesNothing' (event, mark) {
    mark.asDone();
  },

  'unitTests.stateless.doesSomethingAsync' (event, mark) {
    process.nextTick(() => mark.asDone());
  },

  'unitTests.stateless.withService' (event, services, mark) {
    const logger = services.get('logger');

    logger.info('Stateless, with service...');
    mark.asDone();
  }
};

module.exports = { when };
