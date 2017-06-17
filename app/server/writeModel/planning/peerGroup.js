'use strict';

const initialState = {
  foo: 'bar'
};

const commands = {
  /* eslint-disable no-unused-vars */
  start (peerGroup, command, mark) {
    // ...
  },

  join (peerGroup, command, mark) {
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
