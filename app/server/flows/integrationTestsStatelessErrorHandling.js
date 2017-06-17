'use strict';

const when = {
  'integrationTests.stateless.fail' () {
    throw new Error('Something, somewhere, went horribly wrong.');
  },

  'integrationTests.stateless.markAsFailed' (event, mark) {
    mark.asFailed('Something, somewhere, went horribly wrong.');
  }
};

module.exports = { when };
