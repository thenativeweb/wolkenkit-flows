'use strict';

const getFlowType = function (flow) {
  if (!flow) {
    throw new Error('Flow is missing.');
  }

  if (flow.identity && flow.initialState && flow.transitions && flow.when) {
    return 'stateful';
  }
  if (!flow.identity && !flow.initialState && !flow.transitions && flow.when) {
    return 'stateless';
  }
  throw new Error('Unknown flow type.');
};

module.exports = getFlowType;
