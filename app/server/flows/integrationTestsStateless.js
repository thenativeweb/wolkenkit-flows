'use strict';

const needle = require('needle');

const when = {
  'integrationTests.stateless.doesNothing' (event, mark) {
    mark.asDone();
  },

  'integrationTests.stateless.callExternalService' (event, mark) {
    const { port } = event.data;

    needle.get(`http://localhost:${port}/notify`, (err, res) => {
      if (err) {
        return mark.asFailed(err.message);
      }
      if (res.statusCode !== 200) {
        return mark.asFailed('Unexpected status code.');
      }
      mark.asDone();
    });
  }
};

module.exports = { when };
