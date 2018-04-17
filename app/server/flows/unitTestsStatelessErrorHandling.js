'use strict';

const reactions = {
  'unitTests.stateless.fail' () {
    throw new Error('Something, somewhere, went horribly wrong.');
  },

  async 'unitTests.stateless.failAsync' (event) {
    await new Promise(resolve => setTimeout(resolve, 0.1 * 1000));

    event.fail('Something, somewhere, went horribly wrong.');
  }
};

module.exports = { reactions };
