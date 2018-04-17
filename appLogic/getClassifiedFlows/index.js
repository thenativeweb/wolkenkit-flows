'use strict';

const forOwn = require('lodash/forOwn');

const getFlowType = require('./getFlowType');

const getClassifiedFlows = function (flows) {
  if (!flows) {
    throw new Error('Flows are missing.');
  }

  const classifiedFlows = {
    stateful: {},
    stateless: {}
  };

  forOwn(flows, (flow, flowName) => {
    flow.name = flowName;

    const flowType = getFlowType(flow);

    switch (flowType) {
      case 'stateful': {
        forOwn(flow.transitions, state => {
          forOwn(state, (eventListener, eventName) => {
            classifiedFlows.stateful[eventName] = classifiedFlows.stateful[eventName] || [];
            classifiedFlows.stateful[eventName].push(flow);
          });
        });
        break;
      }
      case 'stateless': {
        forOwn(flow.reactions, (eventListener, eventName) => {
          classifiedFlows.stateless[eventName] = classifiedFlows.stateless[eventName] || [];
          classifiedFlows.stateless[eventName].push(flow);
        });
        break;
      }
      default: {
        throw new Error('Invalid operation.');
      }
    }
  });

  return classifiedFlows;
};

module.exports = getClassifiedFlows;
