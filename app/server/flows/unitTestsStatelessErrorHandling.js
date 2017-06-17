'use strict';

const when = {
  'unitTests.stateless.fail' () {
    throw new Error('Something, somewhere, went horribly wrong.');
  },

  'unitTests.stateless.failAsync' (event, mark) {
    process.nextTick(() => mark.asFailed('Something, somewhere, went horribly wrong.'));
  }
};

module.exports = { when };
