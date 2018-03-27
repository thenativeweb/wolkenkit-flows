'use strict';

const needle = require('needle');

const when = {
  'integrationTests.stateless.doesNothing' () {
    // Intentionally left blank.
  },

  async 'integrationTests.stateless.callExternalService' (event) {
    const { port } = event.data;

    let res;

    try {
      res = await needle.get(`http://localhost:${port}/notify`);
    } catch (ex) {
      return event.fail(ex.message);
    }

    if (res.statusCode !== 200) {
      return event.fail('Unexpected status code.');
    }
  }
};

module.exports = { when };
