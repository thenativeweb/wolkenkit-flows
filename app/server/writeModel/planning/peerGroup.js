'use strict';

const initialState = {
  foo: 'bar'
};

const commands = {
  /* eslint-disable no-unused-vars */
  start: {
    isAuthorized () {
      return true;
    },

    handle (peerGroup, command) {
      // ...
    }
  },

  join: {
    isAuthorized () {
      return true;
    },

    handle (peerGroup, command) {
      // ...
    }
  }
  /* eslint-enable no-unused-vars */
};

const events = {
  /* eslint-disable no-unused-vars */
  started: {
    handle (peerGroup, event) {
      // ...
    },

    isAuthorized () {
      return true;
    }
  },

  joined: {
    handle (peerGroup, event) {
      // ...
    },

    isAuthorized () {
      return true;
    }
  }
  /* eslint-enable no-unused-vars */
};

module.exports = { initialState, commands, events };
