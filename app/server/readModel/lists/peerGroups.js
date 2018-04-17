'use strict';

const fields = {
  foo: 'bar'
};

const projections = {
  /* eslint-disable no-unused-vars */
  async 'planning.peerGroup.started' (event) {
    // ...
  },

  async 'planning.peerGroup.joined' (event) {
    // ...
  }
  /* eslint-enable no-unused-vars */
};

module.exports = { fields, projections };
