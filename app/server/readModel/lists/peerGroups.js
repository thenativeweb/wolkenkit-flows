'use strict';

const fields = {
  foo: { initialState: 'bar' }
};

const projections = {
  /* eslint-disable no-unused-vars */
  'planning.peerGroup.started' (event) {
    // ...
  },

  'planning.peerGroup.joined' (event) {
    // ...
  }
  /* eslint-enable no-unused-vars */
};

const queries = {
  readItem: {
    isAuthorized () {
      return true;
    }
  }
};

module.exports = { fields, projections, queries };
