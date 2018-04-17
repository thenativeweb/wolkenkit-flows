'use strict';

const reactions = {
  'integrationTests.stateless.fail' () {
    throw new Error('Something, somewhere, went horribly wrong.');
  },

  'integrationTests.stateless.markAsFailed' (event) {
    event.fail('Something, somewhere, went horribly wrong.');
  }
};

module.exports = { reactions };
