'use strict';

const reactions = {
  'unitTests.stateless.doesNothing' () {
    // Intentionally left blank.
  },

  async 'unitTests.stateless.doesSomethingAsync' () {
    await new Promise(resolve => setTimeout(resolve, 0.1 * 1000));
  },

  'unitTests.stateless.withService' (event, { logger }) {
    logger.info('Stateless, with service...');
  }
};

module.exports = { reactions };
