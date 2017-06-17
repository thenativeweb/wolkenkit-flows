'use strict';

const fields = {
  foo: 'bar'
};

const when = {
  /* eslint-disable no-unused-vars */
  'planning.peerGroup.started' (event, done) {
    // ...
  },

  'planning.peerGroup.joined' (event, done) {
    // ...
  }
  /* eslint-enable no-unused-vars */
};

module.exports = { fields, when };
