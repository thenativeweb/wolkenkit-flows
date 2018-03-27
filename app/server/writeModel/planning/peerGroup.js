'use strict';

const initialState = {
  foo: 'bar'
};

const commands = {
  /* eslint-disable no-unused-vars */
  async start (peerGroup, command) {
    // ...
  },

  async join (peerGroup, command) {
    // ...
  }
  /* eslint-enable no-unused-vars */
};

const events = {
  /* eslint-disable no-unused-vars */
  started (peerGroup, event) {
    // ...
  },

  joined (peerGroup, event) {
    // ...
  }
  /* eslint-enable no-unused-vars */
};

module.exports = { initialState, commands, events };
